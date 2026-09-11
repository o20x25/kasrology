import { useState, useRef, useEffect } from 'react';
import { Highlighter } from 'lucide-react';

interface Highlight {
  start: number;
  end: number;
}

export default function HighlightableText({ text, id }: { text: string, id: number }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [currentSelection, setCurrentSelection] = useState<Highlight | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load highlights from local storage to persist across navigation/refresh
  useEffect(() => {
    const saved = localStorage.getItem(`kasrology_highlights_${id}`);
    if (saved) {
      try { setHighlights(JSON.parse(saved)); } catch(e) {}
    } else {
      setHighlights([]);
    }
    setShowMenu(false);
  }, [id]);

  useEffect(() => {
    if (highlights.length > 0) {
      localStorage.setItem(`kasrology_highlights_${id}`, JSON.stringify(highlights));
    } else {
      localStorage.removeItem(`kasrology_highlights_${id}`);
    }
  }, [highlights, id]);

  const handleMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) {
        setShowMenu(false);
        return;
      }

      if (!containerRef.current.contains(selection.anchorNode)) {
        setShowMenu(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(containerRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      
      const start = preCaretRange.toString().length;
      const end = start + range.toString().length;

      if (start !== end) {
        const rect = range.getBoundingClientRect();
        setMenuPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 45
        });
        setCurrentSelection({ start, end });
        setShowMenu(true);
      }
    }, 10);
  };

  // Hide menu on outside click or scroll
  useEffect(() => {
    const hideMenu = () => {
      const selection = window.getSelection();
      if (showMenu && selection && selection.isCollapsed) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', hideMenu);
    document.addEventListener('scroll', () => setShowMenu(false), true);
    return () => {
      document.removeEventListener('mousedown', hideMenu);
      document.removeEventListener('scroll', () => setShowMenu(false), true);
    };
  }, [showMenu]);

  const applyHighlight = () => {
    if (currentSelection) {
      setHighlights(prev => {
        const newArr = [...prev, currentSelection].sort((a, b) => a.start - b.start);
        const merged: Highlight[] = [];
        for (const h of newArr) {
          if (merged.length === 0) merged.push(h);
          else {
            const last = merged[merged.length - 1];
            if (h.start <= last.end) {
              last.end = Math.max(last.end, h.end);
            } else {
              merged.push(h);
            }
          }
        }
        return merged;
      });
      window.getSelection()?.removeAllRanges();
      setShowMenu(false);
    }
  };

  const removeHighlight = (idx: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== idx));
  };

  const renderText = () => {
    if (highlights.length === 0) return text;
    
    const elements = [];
    let lastEnd = 0;

    highlights.forEach((h, idx) => {
      if (h.start > lastEnd) {
        elements.push(<span key={`text-${idx}`}>{text.slice(lastEnd, h.start)}</span>);
      }
      elements.push(
        <mark 
          key={`mark-${idx}`} 
          className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded px-1 py-0.5 cursor-pointer hover:bg-red-200 dark:hover:bg-red-500/40 transition-colors"
          onClick={() => removeHighlight(idx)}
          title="Click to remove highlight"
        >
          {text.slice(h.start, h.end)}
        </mark>
      );
      lastEnd = h.end;
    });

    if (lastEnd < text.length) {
      elements.push(<span key="text-end">{text.slice(lastEnd)}</span>);
    }

    return elements;
  };

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="text-xl font-medium mb-8 leading-relaxed selection:bg-primary/20"
      >
        {renderText()}
      </div>

      {showMenu && (
        <div 
          className="fixed z-50 transform -translate-x-1/2 bg-gray-900 text-white p-1 rounded-lg shadow-xl flex gap-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button 
            onClick={applyHighlight}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded text-sm font-medium"
          >
            <Highlighter size={16} /> Highlight
          </button>
        </div>
      )}
    </div>
  );
}
