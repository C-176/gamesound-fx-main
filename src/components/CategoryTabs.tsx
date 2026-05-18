import type { Category } from '../data/sounds';
import { Gamepad, Globe, PixelStar } from './PixelIcons';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  favoritesCount: number;
}

function CategoryTabs({ categories, activeCategory, onCategoryChange, favoritesCount }: CategoryTabsProps) {
  const categoryIcon = (id: string) => {
    switch (id) {
      case 'local': return <Gamepad size={14} color="currentColor" />;
      case 'online': return <Globe size={14} color="currentColor" />;
      case 'favorite': return <PixelStar size={14} color="currentColor" />;
      default: return <Gamepad size={14} color="currentColor" />;
    }
  };

  return (
    <div className="px-2 py-2 bg-bg-secondary border-b border-border-default flex gap-1 overflow-x-auto">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-3 py-1.5 border text-sm cursor-pointer flex items-center gap-1.5 transition-none whitespace-nowrap rounded-lg
            ${activeCategory === category.id
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-transparent bg-transparent text-text-secondary hover:border-border-default hover:text-text-primary'
            }
            `}
        >
          <span className="shrink-0">{categoryIcon(category.id)}</span>
          <span>{category.name}</span>
          {category.id === 'favorite' && favoritesCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold rounded-md">{favoritesCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
