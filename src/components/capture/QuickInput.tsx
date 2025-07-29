/**
 * 快速输入组件
 * 提供快速收集想法和任务的输入界面
 */

import { useState, useRef, useEffect } from 'react';
import { InputType } from '../../types';
import { useGTDStore } from '../../store/gtd-store';

interface QuickInputProps {
  onSubmit?: (content: string, type: InputType) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const QuickInput: React.FC<QuickInputProps> = ({
  onSubmit,
  placeholder = '快速记录想法或任务...',
  autoFocus = false,
  className = '',
}) => {
  const [content, setContent] = useState('');
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { addInboxItem, isCapturing, captureError } = useGTDStore();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      await addInboxItem({
        content: content.trim(),
        type: inputType,
        processed: false,
      });

      // 调用外部回调
      onSubmit?.(content.trim(), inputType);

      // 立即清空输入 - 在try块内确保清空
      setContent('');
      
      // 重置输入类型为默认值
      setInputType(InputType.TEXT);

    } catch (error) {
      console.error('添加项目失败:', error);
    } finally {
      setIsSubmitting(false);
      
      // 确保在finally块中也清空，以防万一
      if (inputRef.current && inputRef.current.value !== '') {
        setContent('');
        inputRef.current.value = '';
      }
      
      // 重新聚焦
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter 提交
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  const isLoading = isCapturing || isSubmitting;

  return (
    <div className={`quick-input ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="modern-input w-full resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
            style={{ minHeight: '120px' }}
          />

          {/* 字符计数 */}
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
            {content.length}/5000
          </div>
        </div>

        {/* 控制面板 */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-6">
            {/* 左侧：输入类型选择 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm">📝</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  类型
                </span>
              </div>
              
              {/* 类型选择按钮组 */}
              <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-600 shadow-sm">
                <button
                  type="button"
                  onClick={() => setInputType(InputType.TEXT)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    inputType === InputType.TEXT
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  📝 文本
                </button>
                <button
                  type="button"
                  onClick={() => setInputType(InputType.VOICE)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    inputType === InputType.VOICE
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  🎙️ 语音
                </button>
                <button
                  type="button"
                  onClick={() => setInputType(InputType.IMAGE)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    inputType === InputType.IMAGE
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  🖼️ 图片
                </button>
              </div>
            </div>

            {/* 右侧：提交按钮 */}
            <button
              type="submit"
              disabled={!content.trim() || isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none px-8 py-3 text-base font-semibold"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="loading-spinner mr-3"></div>
                  添加中...
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">✨</span>
                  添加到工作篮
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 快捷键提示 */}
        <div className="flex items-center justify-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
            <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">⚡</span>
            </div>
            <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
            </span>
            <span className="text-gray-500 dark:text-gray-400">快速提交</span>
          </div>
        </div>

        {/* 错误提示 */}
        {captureError && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-500 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {captureError}
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuickInput;
