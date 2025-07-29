import React, { useState, useEffect } from 'react';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  videoUrl?: string;
}

interface HelpCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  topics: HelpTopic[];
}

const helpData: HelpCategory[] = [
  {
    id: 'getting-started',
    name: '快速开始',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'what-is-gtd',
        title: '什么是GTD？',
        content: `
          <h3>GTD (Getting Things Done) 简介</h3>
          <p>GTD是由David Allen创建的一套个人生产力系统，帮助您：</p>
          <ul>
            <li>收集所有想法和任务</li>
            <li>系统化地处理和组织</li>
            <li>专注于当前最重要的事情</li>
            <li>减少压力，提高效率</li>
          </ul>
          
          <h4>五个核心步骤：</h4>
          <ol>
            <li><strong>收集</strong> - 记录所有想法</li>
            <li><strong>处理</strong> - 决定每个项目的意义</li>
            <li><strong>组织</strong> - 将任务分类整理</li>
            <li><strong>执行</strong> - 根据情境选择行动</li>
            <li><strong>回顾</strong> - 定期检查和更新系统</li>
          </ol>
        `,
        category: 'getting-started',
        keywords: ['GTD', '入门', '介绍', '方法论'],
        videoUrl: 'https://example.com/gtd-intro-video',
      },
      {
        id: 'first-steps',
        title: '如何开始使用？',
        content: `
          <h3>开始使用GTD工具</h3>
          <p>按照以下步骤开始您的GTD之旅：</p>
          
          <h4>第一步：收集所有想法</h4>
          <p>花30分钟时间，将脑海中所有的想法、任务、承诺都记录到工作篮中。不要分析或判断，只是记录。</p>
          
          <h4>第二步：处理工作篮</h4>
          <p>对每个项目问："这是什么？需要行动吗？"然后按照处理向导进行分类。</p>
          
          <h4>第三步：设置情境</h4>
          <p>根据您的工作和生活环境创建情境，如：办公室、家里、电脑、电话等。</p>
          
          <h4>第四步：开始执行</h4>
          <p>根据当前情境选择合适的任务开始执行。</p>
        `,
        category: 'getting-started',
        keywords: ['开始', '入门', '第一次', '设置'],
      },
    ],
  },
  {
    id: 'capture',
    name: '收集功能',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'quick-input',
        title: '如何快速记录想法？',
        content: `
          <h3>快速输入功能</h3>
          <p>GTD工具提供多种方式快速记录您的想法：</p>
          
          <h4>文本输入</h4>
          <ul>
            <li>点击页面顶部的输入框</li>
            <li>使用快捷键 <kbd>Ctrl+N</kbd></li>
            <li>输入简短的描述即可</li>
          </ul>
          
          <h4>语音输入</h4>
          <ul>
            <li>点击麦克风图标</li>
            <li>说出您的想法</li>
            <li>系统会自动转换为文本</li>
          </ul>
          
          <h4>图片输入</h4>
          <ul>
            <li>拖拽图片到输入区域</li>
            <li>或点击上传按钮选择图片</li>
            <li>可以添加图片描述</li>
          </ul>
          
          <p><strong>提示：</strong>收集时不要过度思考，简短明确即可，详细信息可以在处理时添加。</p>
        `,
        category: 'capture',
        keywords: ['收集', '输入', '记录', '想法', '语音', '图片'],
      },
    ],
  },
  {
    id: 'process',
    name: '处理功能',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'processing-wizard',
        title: '如何使用处理向导？',
        content: `
          <h3>处理向导使用指南</h3>
          <p>处理向导会引导您完成GTD的核心决策流程：</p>
          
          <h4>步骤1：这是什么？</h4>
          <p>明确项目的具体内容，添加详细描述。</p>
          
          <h4>步骤2：需要行动吗？</h4>
          <ul>
            <li><strong>不需要行动</strong>：选择删除、备忘录或参考资料</li>
            <li><strong>需要行动</strong>：继续下一步</li>
          </ul>
          
          <h4>步骤3：下一步行动是什么？</h4>
          <p>定义具体的、可执行的行动。避免模糊的描述。</p>
          
          <h4>步骤4：2分钟规则</h4>
          <ul>
            <li><strong>能在2分钟内完成</strong>：立即执行</li>
            <li><strong>需要更多时间</strong>：继续分类</li>
          </ul>
          
          <h4>步骤5：委派还是自己做？</h4>
          <ul>
            <li><strong>委派他人</strong>：添加到等待列表</li>
            <li><strong>自己做</strong>：继续分类</li>
          </ul>
          
          <h4>步骤6：何时做？</h4>
          <ul>
            <li><strong>特定时间</strong>：添加到日程</li>
            <li><strong>尽快做</strong>：添加到下一步行动</li>
          </ul>
        `,
        category: 'process',
        keywords: ['处理', '向导', '决策', '分类', '2分钟规则'],
      },
    ],
  },
  {
    id: 'organize',
    name: '组织功能',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'contexts',
        title: '如何设置和使用情境？',
        content: `
          <h3>情境管理指南</h3>
          <p>情境帮助您根据当前环境选择合适的任务。</p>
          
          <h4>什么是情境？</h4>
          <p>情境是完成任务所需的工具、地点或状态。例如：</p>
          <ul>
            <li>🏢 <strong>办公室</strong>：需要在办公室完成的任务</li>
            <li>💻 <strong>电脑</strong>：需要使用电脑的任务</li>
            <li>📞 <strong>电话</strong>：需要打电话的任务</li>
            <li>🛒 <strong>外出</strong>：外出时可以完成的任务</li>
          </ul>
          
          <h4>如何创建情境？</h4>
          <ol>
            <li>进入"组织"页面</li>
            <li>点击"情境管理"</li>
            <li>点击"添加情境"</li>
            <li>输入名称、选择颜色和图标</li>
            <li>保存设置</li>
          </ol>
          
          <h4>使用技巧</h4>
          <ul>
            <li>根据实际工作环境设置情境</li>
            <li>不要创建太多情境，5-10个即可</li>
            <li>定期回顾和调整情境设置</li>
          </ul>
        `,
        category: 'organize',
        keywords: ['情境', '环境', '分类', '组织'],
      },
    ],
  },
  {
    id: 'engage',
    name: '执行功能',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'today-view',
        title: '如何使用今日任务视图？',
        content: `
          <h3>今日任务视图使用指南</h3>
          <p>今日任务视图帮助您专注于当天最重要的任务。</p>
          
          <h4>任务显示规则</h4>
          <ul>
            <li>今天到期的任务</li>
            <li>逾期未完成的任务</li>
            <li>标记为今日执行的任务</li>
            <li>高优先级的紧急任务</li>
          </ul>
          
          <h4>任务操作</h4>
          <ul>
            <li><strong>完成任务</strong>：点击复选框</li>
            <li><strong>编辑任务</strong>：点击任务标题</li>
            <li><strong>延期任务</strong>：拖拽到新日期</li>
            <li><strong>调整优先级</strong>：使用优先级按钮</li>
          </ul>
          
          <h4>使用技巧</h4>
          <ul>
            <li>每天早上查看今日任务</li>
            <li>根据时间和精力选择任务</li>
            <li>完成任务后及时标记</li>
            <li>避免安排过多任务</li>
          </ul>
        `,
        category: 'engage',
        keywords: ['今日任务', '执行', '完成', '优先级'],
      },
    ],
  },
  {
    id: 'review',
    name: '回顾功能',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'weekly-review',
        title: '如何进行每周回顾？',
        content: `
          <h3>每周回顾指南</h3>
          <p>每周回顾是GTD系统的核心，确保系统的有效性和可信度。</p>
          
          <h4>回顾频率</h4>
          <p>建议每周进行一次完整回顾，选择固定的时间（如周五下午或周日晚上）。</p>
          
          <h4>回顾清单</h4>
          <ol>
            <li><strong>收集</strong>：收集散落的想法和任务</li>
            <li><strong>处理</strong>：清空工作篮中的所有项目</li>
            <li><strong>回顾项目</strong>：检查所有活跃项目的状态</li>
            <li><strong>检查等待</strong>：跟进等待他人的任务</li>
            <li><strong>查看日程</strong>：回顾过去一周，准备下周</li>
            <li><strong>回顾备忘录</strong>：检查是否有需要激活的项目</li>
          </ol>
          
          <h4>系统统计</h4>
          <p>回顾页面会显示：</p>
          <ul>
            <li>本周完成的任务数量</li>
            <li>新增任务数量</li>
            <li>项目进展情况</li>
            <li>系统健康度评分</li>
          </ul>
          
          <h4>回顾技巧</h4>
          <ul>
            <li>选择安静的环境，避免打扰</li>
            <li>诚实评估系统的有效性</li>
            <li>根据回顾结果调整系统</li>
            <li>庆祝完成的成就</li>
          </ul>
        `,
        category: 'review',
        keywords: ['回顾', '每周', '检查', '统计', '评估'],
      },
    ],
  },
  {
    id: 'tips',
    name: '使用技巧',
    icon: BookOpenIcon,
    topics: [
      {
        id: 'keyboard-shortcuts',
        title: '键盘快捷键',
        content: `
          <h3>键盘快捷键参考</h3>
          
          <h4>全局快捷键</h4>
          <table>
            <tr><td><kbd>Ctrl+N</kbd></td><td>新建任务</td></tr>
            <tr><td><kbd>Ctrl+/</kbd></td><td>快速输入</td></tr>
            <tr><td><kbd>Ctrl+F</kbd></td><td>搜索</td></tr>
            <tr><td><kbd>Ctrl+S</kbd></td><td>保存当前编辑</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>关闭弹窗或取消编辑</td></tr>
          </table>
          
          <h4>导航快捷键</h4>
          <table>
            <tr><td><kbd>1</kbd></td><td>切换到收集页面</td></tr>
            <tr><td><kbd>2</kbd></td><td>切换到处理页面</td></tr>
            <tr><td><kbd>3</kbd></td><td>切换到组织页面</td></tr>
            <tr><td><kbd>4</kbd></td><td>切换到执行页面</td></tr>
            <tr><td><kbd>5</kbd></td><td>切换到回顾页面</td></tr>
          </table>
          
          <h4>任务操作快捷键</h4>
          <table>
            <tr><td><kbd>Space</kbd></td><td>标记任务完成/未完成</td></tr>
            <tr><td><kbd>E</kbd></td><td>编辑选中的任务</td></tr>
            <tr><td><kbd>D</kbd></td><td>删除选中的任务</td></tr>
            <tr><td><kbd>P</kbd></td><td>设置优先级</td></tr>
            <tr><td><kbd>C</kbd></td><td>更改情境</td></tr>
            <tr><td><kbd>T</kbd></td><td>设置时间</td></tr>
          </table>
          
          <h4>列表操作快捷键</h4>
          <table>
            <tr><td><kbd>↑/↓</kbd></td><td>上下选择任务</td></tr>
            <tr><td><kbd>Enter</kbd></td><td>打开选中的任务</td></tr>
            <tr><td><kbd>Ctrl+A</kbd></td><td>全选</td></tr>
            <tr><td><kbd>Ctrl+Shift+A</kbd></td><td>取消全选</td></tr>
          </table>
        `,
        category: 'tips',
        keywords: ['快捷键', '键盘', '操作', '导航'],
      },
    ],
  },
];

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
}

export const HelpSystem: React.FC<HelpSystemProps> = ({
  isOpen,
  onClose,
  initialTopic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(
    initialTopic || null
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (initialTopic) {
      // 找到包含该主题的分类并展开
      const category = helpData.find((cat) =>
        cat.topics.some((topic) => topic.id === initialTopic)
      );
      if (category) {
        setSelectedCategory(category.id);
        setExpandedCategories((prev) => new Set([...prev, category.id]));
      }
    }
  }, [initialTopic]);

  const filteredTopics = React.useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    const results: HelpTopic[] = [];

    helpData.forEach((category) => {
      category.topics.forEach((topic) => {
        const matchesTitle = topic.title.toLowerCase().includes(query);
        const matchesContent = topic.content.toLowerCase().includes(query);
        const matchesKeywords = topic.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        );

        if (matchesTitle || matchesContent || matchesKeywords) {
          results.push(topic);
        }
      });
    });

    return results;
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const selectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
    setSearchQuery(''); // 清除搜索
  };

  const currentTopic = React.useMemo(() => {
    if (!selectedTopic) return null;

    for (const category of helpData) {
      const topic = category.topics.find((t) => t.id === selectedTopic);
      if (topic) return topic;
    }
    return null;
  }, [selectedTopic]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full">
          {/* 侧边栏 */}
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">帮助中心</h2>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* 搜索 */}
            <div className="p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索帮助内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery ? (
                // 搜索结果
                <div className="p-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">
                    搜索结果 ({filteredTopics.length})
                  </h3>
                  {filteredTopics.length === 0 ? (
                    <p className="text-sm text-gray-500">未找到相关内容</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredTopics.map((topic) => (
                        <li key={topic.id}>
                          <button
                            onClick={() => selectTopic(topic.id)}
                            className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                              selectedTopic === topic.id
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700'
                            }`}
                          >
                            {topic.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // 分类列表
                <div>
                  {helpData.map((category) => (
                    <div key={category.id}>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <category.icon className="mr-3 h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {category.name}
                          </span>
                        </div>
                        {expandedCategories.has(category.id) ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>

                      {expandedCategories.has(category.id) && (
                        <ul className="bg-white">
                          {category.topics.map((topic) => (
                            <li key={topic.id}>
                              <button
                                onClick={() => selectTopic(topic.id)}
                                className={`w-full px-8 py-2 text-left text-sm hover:bg-gray-50 ${
                                  selectedTopic === topic.id
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600'
                                }`}
                              >
                                {topic.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部链接 */}
            <div className="border-t border-gray-200 p-4">
              <div className="space-y-2">
                <a
                  href="/docs/user-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <BookOpenIcon className="mr-2 h-4 w-4" />
                  完整用户指南
                </a>
                <a
                  href="/docs/developer-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <BookOpenIcon className="mr-2 h-4 w-4" />
                  开发者文档
                </a>
                <a
                  href="mailto:support@gtd-tool.com"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ChatBubbleLeftRightIcon className="mr-2 h-4 w-4" />
                  联系支持
                </a>
              </div>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 overflow-y-auto">
            {currentTopic ? (
              <div className="p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentTopic.title}
                  </h1>
                  {currentTopic.videoUrl && (
                    <div className="mb-4">
                      <a
                        href={currentTopic.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <VideoCameraIcon className="mr-1 h-4 w-4" />
                        观看演示视频
                      </a>
                    </div>
                  )}
                </div>

                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentTopic.content }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    欢迎使用帮助中心
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    选择左侧的主题或使用搜索功能查找帮助内容
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 帮助按钮组件
export const HelpButton: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      title="获取帮助"
    >
      <QuestionMarkCircleIcon className="h-6 w-6" />
    </button>
  );
};

export default HelpSystem;
