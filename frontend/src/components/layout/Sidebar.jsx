import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Inbox,
  Calendar,
  Flag,
  FolderKanban,
  Tag,
  RefreshCw,
  CheckCircle2,
  Plus,
  Settings,
  LogOut,
  Sun,
  Moon,
  User
} from 'lucide-react';

const navItems = [
  { path: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
  { path: '/forecast', label: 'Forecast', icon: Calendar },
  { path: '/flagged', label: 'Flagged', icon: Flag, badge: 'flagged' },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/tags', label: 'Tags', icon: Tag },
  { path: '/review', label: 'Review', icon: RefreshCw, badge: 'review' },
  { path: '/completed', label: 'Completed', icon: CheckCircle2 },
];

export default function Sidebar({ onQuickEntry, stats = {} }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const getBadgeCount = (badge) => {
    if (!badge || !stats) return null;
    switch (badge) {
      case 'inbox': return stats.inbox;
      case 'flagged': return stats.flagged;
      case 'review': return stats.projectsForReview;
      default: return null;
    }
  };

  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">GTD Pro</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Getting Things Done</p>
          </div>
        </div>
      </div>

      {/* Quick Entry Button */}
      <div className="p-4">
        <button
          onClick={onQuickEntry}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Quick Entry
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badge = getBadgeCount(item.badge);
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  {badge > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5" />
              <span className="font-medium">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span className="font-medium">Dark Mode</span>
            </>
          )}
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isActive
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </NavLink>

        {/* User */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {user?.name}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
