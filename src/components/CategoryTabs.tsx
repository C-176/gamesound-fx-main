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
    <div className="px-2 py-2 bg-bg-secondary border-b-2 border-border-default flex gap-1 overflow-x-auto">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-3 py-1.5 border-2 text-base font-pixel cursor-pointer flex items-center gap-1.5 transition-none whitespace-nowrap rounded-none
            ${activeCategory === category.id
              ? 'border-accent bg-accent/10 text-accent shadow-[2px_2px_0_var(--accent)] translate-x-0 translate-y-0'
              : 'border-transparent bg-transparent text-text-secondary hover:border-border-default hover:text-text-primary hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--border-default)]'
            }
            active:translate-x-0 active:translate-y-0 active:shadow-none`}
        >
          <span className="shrink-0">{categoryIcon(category.id)}</span>
          <span>{category.name}</span>
          {category.id === 'favorite' && favoritesCount > 0 && (
            <span className="text-sm font-pixel px-1 py-0.5 bg-accent-gold text-black">{favoritesCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
