import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/my/dashboard', label: 'Home' },
    { path: '/my/notes', label: 'Notes' },
    { path: '/my/tags', label: 'Tags' },
    { path: '/my/graph', label: 'Graph' },
    { path: '/my/vector-space', label: 'Vector Space' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-72 flex-shrink-0 bg-background-light/80 dark:bg-background-dark/50 p-6 flex flex-col justify-between backdrop-blur-sm border-r border-primary/10 dark:border-primary/20">
      <div>
        <div className="flex items-center gap-2 mb-8">
          <Link to="/my/dashboard" className="text-lg font-bold text-background-dark dark:text-background-light hover:text-primary transition-colors">
            Yapgan
          </Link>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                isActive(item.path)
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium'
                  : 'text-background-dark/70 dark:text-background-light/70 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary transition-colors'
              }`}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <button className="w-full h-10 px-4 rounded-lg bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-colors"
        onClick={() => window.location.href = '/my/new-note'}
      >
        New Note
      </button>
    </aside>
  );
};

export default Sidebar;
