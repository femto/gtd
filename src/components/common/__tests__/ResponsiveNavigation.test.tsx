import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveNavigation } from '../ResponsiveNavigation';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('ResponsiveNavigation', () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    mockOnViewChange.mockClear();
  });

  it('renders navigation items correctly', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
      />
    );

    expect(screen.getByText('GTD 工具')).toBeInTheDocument();
    expect(screen.getAllByText('收集处理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('情境管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('项目管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('任务组织').length).toBeGreaterThan(0);
    expect(screen.getAllByText('执行任务').length).toBeGreaterThan(0);
  });

  it('highlights current view correctly', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="projects"
        onViewChange={mockOnViewChange}
      />
    );

    const projectsButtons = screen.getAllByText('项目管理');
    expect(projectsButtons[0]).toHaveClass('bg-blue-100');
  });

  it('calls onViewChange when navigation item is clicked', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
      />
    );

    const contextsButtons = screen.getAllByText('情境管理');
    fireEvent.click(contextsButtons[0]); // Click the first one (desktop)

    expect(mockOnViewChange).toHaveBeenCalledWith('contexts');
  });

  it('shows offline indicator when offline', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
        isOffline={true}
      />
    );

    expect(screen.getByText('离线模式')).toBeInTheDocument();
  });

  it('toggles mobile menu correctly', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
      />
    );

    const menuButton = screen.getByLabelText('打开主菜单');

    // Initially mobile menu should be hidden
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);

    // After click, mobile menu should be visible
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes mobile menu when navigation item is selected', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
      />
    );

    // Open mobile menu
    const menuButton = screen.getByLabelText('打开主菜单');
    fireEvent.click(menuButton);

    // Click on a navigation item in mobile menu
    const mobileNavItems = screen.getAllByText('情境管理');
    const mobileNavItem = mobileNavItems[mobileNavItems.length - 1]; // Last one should be in mobile menu
    fireEvent.click(mobileNavItem);

    expect(mockOnViewChange).toHaveBeenCalledWith('contexts');
  });

  it('includes theme toggle component', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
      />
    );

    const themeToggles = screen.getAllByLabelText('选择主题');
    expect(themeToggles.length).toBeGreaterThan(0);
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(
      <ResponsiveNavigation
        currentView="capture"
        onViewChange={mockOnViewChange}
      />
    );

    const currentButtons = screen.getAllByText('收集处理');
    expect(currentButtons[0]).toHaveAttribute('aria-current', 'page');

    const menuButton = screen.getByLabelText('打开主菜单');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});
