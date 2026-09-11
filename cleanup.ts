import { db } from './src/db/index.ts';
import { folders, folderQuestions } from './src/db/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';

async function cleanupFolders() {
  console.log('Cleaning up duplicate folders...');
  const allFolders = await db.select().from(folders);
  
  // Group by studentId + name
  const grouped = new Map<string, typeof allFolders>();
  for (const f of allFolders) {
    const key = `${f.studentId}-${f.name}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(f);
  }

  for (const [key, group] of grouped.entries()) {
    if (group.length > 1) {
      // Sort by ID so we keep the first one
      group.sort((a, b) => a.id - b.id);
      const keepFolder = group[0];
      const deleteFolders = group.slice(1);
      const deleteIds = deleteFolders.map(f => f.id);
      
      console.log(`Merging ${deleteIds.length} duplicate(s) for folder '${keepFolder.name}' (User ${keepFolder.studentId}) into ID ${keepFolder.id}`);
      
      // Get all questions in folders to be deleted
      const questionsToMove = await db.select().from(folderQuestions).where(inArray(folderQuestions.folderId, deleteIds));
      
      for (const q of questionsToMove) {
        try {
          await db.insert(folderQuestions).values({
            folderId: keepFolder.id,
            questionId: q.questionId
          }).onConflictDoNothing();
        } catch(e) {
          // ignore unique constraint errors if question is already in the target folder
        }
      }
      
      // Delete the duplicate questions from old folders
      if (deleteIds.length > 0) {
        await db.delete(folderQuestions).where(inArray(folderQuestions.folderId, deleteIds));
        // Delete the duplicate folders themselves
        await db.delete(folders).where(inArray(folders.id, deleteIds));
      }
    }
  }
  
  console.log('Cleanup complete!');
}

cleanupFolders().catch(console.error).finally(() => process.exit(0));
