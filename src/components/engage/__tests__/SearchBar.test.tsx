/**
 * SearchBar 组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchBar } from '../SearchBar';
import { useGTDStore } from '../../../store/gtd-store';
import { searchService } from '../../../utils/search-service';

// Mock store
vi.mock('../../../store/gtd-store');
const mockUseGTDStore = vi.mocked(useGTDStore);

// Mock search service
vi.mock('../../../utils/search-service', () => ({
  searchService: {
    getSuggestions: vi.fn(),
    getSearchHistory: vi.fn(),
    removeFromHistory: vi.fn(),
  },
}));

const mockSearchService = vi.mocked(searchService);

describe('SearchBar', () => {
  const mockOnChange = vi.fn();
  const mockOnSearch = vi.fn();

  const mockStoreData = {
    contexts: [
      {
        id: '1',
        name: '办公室',
        color: '#blue',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: '家里',
        color: '#green',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    projects: [
      {
        id: '1',
        title: '网站项目',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: '移动应用',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    mockUseGTDStore.mockReturnValue(mockStoreData as any);
    mockSearchService.getSuggestions.mockReturnValue([]);
    mockSearchService.getSearchHistory.mockReturnValue([]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该渲染搜索输入框', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('搜索任务、项目...')
      ).toBeInTheDocument();
    });

    it('应该显示自定义占位符', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          placeholder="自定义占位符"
        />
      );

      expect(screen.getByPlaceholderText('自定义占位符')).toBeInTheDocument();
    });

    it('应该显示搜索图标', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      const searchIcon = screen
        .getByRole('textbox')
        .parentElement?.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });

    it('应该显示快捷键提示', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });
  });

  describe('输入交互', () => {
    it('应该调用onChange当输入变化时', async () => {
      const user = userEvent.setup();
      render(<SearchBar value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '测试');

      expect(mockOnChange).toHaveBeenCalledWith('测试');
    });

    it('应该显示清空按钮当有输入时', () => {
      render(<SearchBar value="测试内容" onChange={mockOnChange} />);

      expect(screen.getByTitle('清空搜索')).toBeInTheDocument();
    });

    it('应该清空输入当点击清空按钮时', async () => {
      const user = userEvent.setup();
      render(<SearchBar value="测试内容" onChange={mockOnChange} />);

      const clearButton = screen.getByTitle('清空搜索');
      await user.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('应该隐藏快捷键提示当有输入时', () => {
      render(<SearchBar value="测试内容" onChange={mockOnChange} />);

      expect(screen.queryByText('⌘K')).not.toBeInTheDocument();
    });
  });

  describe('键盘快捷键', () => {
    it('应该聚焦输入框当按下Cmd+K时', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it('应该聚焦输入框当按下Ctrl+K时', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it('应该清空搜索当按下Escape时', async () => {
      render(<SearchBar value="测试内容" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      input.focus();
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('搜索建议', () => {
    beforeEach(() => {
      mockSearchService.getSuggestions.mockReturnValue([
        { text: '历史搜索', type: 'history', count: 5 },
        { text: '@办公室', type: 'context' },
        { text: '#网站项目', type: 'project' },
        { text: '#工作', type: 'tag' },
      ]);
    });

    it('应该显示建议下拉框当聚焦时', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar value="" onChange={mockOnChange} showSuggestions={true} />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('历史搜索')).toBeInTheDocument();
      });
    });

    it('应该显示不同类型的建议图标', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar value="" onChange={mockOnChange} showSuggestions={true} />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('@办公室')).toBeInTheDocument();
        expect(screen.getByText('#网站项目')).toBeInTheDocument();
        expect(screen.getByText('#工作')).toBeInTheDocument();
      });
    });

    it('应该选择建议当点击时', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          showSuggestions={true}
        />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('@办公室')).toBeInTheDocument();
      });

      await user.click(screen.getByText('@办公室'));

      expect(mockOnChange).toHaveBeenCalledWith('@办公室');
      expect(mockOnSearch).toHaveBeenCalledWith('@办公室');
    });

    it('应该支持键盘导航建议', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar value="" onChange={mockOnChange} showSuggestions={true} />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('历史搜索')).toBeInTheDocument();
      });

      // 按下箭头键导航
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledWith('历史搜索');
    });

    it('应该关闭下拉框当点击外部时', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <SearchBar value="" onChange={mockOnChange} showSuggestions={true} />
          <div data-testid="outside">外部元素</div>
        </div>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('历史搜索')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('历史搜索')).not.toBeInTheDocument();
      });
    });
  });

  describe('搜索历史', () => {
    beforeEach(() => {
      mockSearchService.getSearchHistory.mockReturnValue([
        { query: '历史查询1', timestamp: new Date(), resultCount: 3 },
        { query: '历史查询2', timestamp: new Date(), resultCount: 7 },
      ]);
    });

    it('应该显示搜索历史当没有输入时', async () => {
      const user = userEvent.setup();
      render(<SearchBar value="" onChange={mockOnChange} showHistory={true} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('历史查询1')).toBeInTheDocument();
        expect(screen.getByText('历史查询2')).toBeInTheDocument();
      });
    });

    it('应该显示结果计数', async () => {
      const user = userEvent.setup();
      render(<SearchBar value="" onChange={mockOnChange} showHistory={true} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('(3)')).toBeInTheDocument();
        expect(screen.getByText('(7)')).toBeInTheDocument();
      });
    });

    it('应该能够删除历史记录', async () => {
      const user = userEvent.setup();
      render(<SearchBar value="" onChange={mockOnChange} showHistory={true} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('历史查询1')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByTitle('删除历史记录')[0];
      await user.click(deleteButton);

      expect(mockSearchService.removeFromHistory).toHaveBeenCalledWith(
        '历史查询1'
      );
    });
  });

  describe('表单提交', () => {
    it('应该调用onSearch当提交表单时', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar
          value="测试查询"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('测试查询');
    });

    it('应该阻止默认表单提交行为', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <form onSubmit={mockSubmit}>
          <SearchBar
            value="测试查询"
            onChange={mockOnChange}
            onSearch={mockOnSearch}
          />
        </form>
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{enter}');

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('应该不调用onSearch当查询为空时', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar value="" onChange={mockOnChange} onSearch={mockOnSearch} />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{enter}');

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe('可访问性', () => {
    it('应该有正确的ARIA属性', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('应该有正确的按钮标题', () => {
      render(<SearchBar value="测试" onChange={mockOnChange} />);

      expect(screen.getByTitle('清空搜索')).toBeInTheDocument();
    });

    it('应该支持键盘导航', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      input.focus();

      expect(input).toHaveFocus();
    });
  });

  describe('自定义样式', () => {
    it('应该应用自定义className', () => {
      render(
        <SearchBar value="" onChange={mockOnChange} className="custom-class" />
      );

      const container = screen.getByRole('textbox').closest('.custom-class');
      expect(container).toBeInTheDocument();
    });

    it('应该在聚焦时改变样式', async () => {
      const user = userEvent.setup();
      render(<SearchBar value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(input).toHaveClass('bg-white');
    });
  });

  describe('禁用功能', () => {
    it('应该不显示建议当showSuggestions为false时', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar value="" onChange={mockOnChange} showSuggestions={false} />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.queryByText('历史搜索')).not.toBeInTheDocument();
    });

    it('应该不显示历史当showHistory为false时', async () => {
      const user = userEvent.setup();
      render(
        <SearchBar value="" onChange={mockOnChange} showHistory={false} />
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(screen.queryByText('历史查询1')).not.toBeInTheDocument();
    });
  });
});
