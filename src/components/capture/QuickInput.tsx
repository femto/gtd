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
  const [isFocused, setIsFocused] = useState(false);
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
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 主输入区域 */}
        <div className={`relative transition-all duration-300 ${isFocused ? 'transform scale-[1.02]' : ''}`}>
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            className={`
              w-full resize-none transition-all duration-300 rounded-2xl border-2 p-6 text-lg
              bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
              shadow-lg hover:shadow-xl focus:shadow-2xl
              ${isFocused 
                ? 'border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30
            `}
            rows={4}
            style={{ minHeight: '140px' }}
          />

          {/* 增强的字符计数 */}
          <div className="absolute bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full shadow-md backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50">
            {content.length}/5000
          </div>

          {/* 输入状态指示器 */}
          {isFocused && (
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">正在输入...</span>
            </div>
          )}
        </div>

        {/* 美化的控制面板 */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-3xl p-8 border border-gray-200/30 dark:border-gray-600/30 shadow-2xl backdrop-blur-lg">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* 重新设计的输入类型选择区域 */}
            <div className="w-full lg:flex-1">
              <div className="text-center lg:text-left mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  选择输入方式
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  根据您的需求选择最合适的输入类型
                </p>
              </div>
              
              {/* 卡片式类型选择器 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setInputType(InputType.TEXT)}
                  disabled={isLoading}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                    inputType === InputType.TEXT
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/50 ring-2 ring-blue-300'
                      : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-lg hover:shadow-xl border border-gray-200/50 dark:border-gray-600/50'
                  }`}
                >
                  <div className="relative z-10">
                    <div className={`text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 ${
                      inputType === InputType.TEXT ? 'animate-pulse' : ''
                    }`}>
                      📝
                    </div>
                    <div className="font-bold text-lg mb-1">文本输入</div>
                    <div className={`text-xs opacity-80 ${
                      inputType === InputType.TEXT ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      快速记录想法
                    </div>
                  </div>
                  {inputType === InputType.TEXT && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInputType(InputType.VOICE)}
                  disabled={isLoading}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                    inputType === InputType.VOICE
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-200 dark:shadow-green-900/50 ring-2 ring-green-300'
                      : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-lg hover:shadow-xl border border-gray-200/50 dark:border-gray-600/50'
                  }`}
                >
                  <div className="relative z-10">
                    <div className={`text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 ${
                      inputType === InputType.VOICE ? 'animate-pulse' : ''
                    }`}>
                      🎙️
                    </div>
                    <div className="font-bold text-lg mb-1">语音输入</div>
                    <div className={`text-xs opacity-80 ${
                      inputType === InputType.VOICE ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      语音转文字
                    </div>
                  </div>
                  {inputType === InputType.VOICE && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInputType(InputType.IMAGE)}
                  disabled={isLoading}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                    inputType === InputType.IMAGE
                      ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-xl shadow-purple-200 dark:shadow-purple-900/50 ring-2 ring-purple-300'
                      : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-lg hover:shadow-xl border border-gray-200/50 dark:border-gray-600/50'
                  }`}
                >
                  <div className="relative z-10">
                    <div className={`text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 ${
                      inputType === InputType.IMAGE ? 'animate-pulse' : ''
                    }`}>
                      🖼️
                    </div>
                    <div className="font-bold text-lg mb-1">图片输入</div>
                    <div className={`text-xs opacity-80 ${
                      inputType === InputType.IMAGE ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      上传图片
                    </div>
                  </div>
                  {inputType === InputType.IMAGE && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                </button>
              </div>
            </div>
            {/* 右侧：美化的提交按钮 */}
            <div className="w-full lg:w-auto lg:flex-shrink-0">
              <button
                type="submit"
                disabled={!content.trim() || isLoading}
                className={`
                  group relative overflow-hidden w-full lg:w-auto px-12 py-5 text-lg font-bold text-white rounded-2xl
                  transition-all duration-300 transform hover:scale-105 active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  ${!content.trim() || isLoading 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700' 
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-2xl hover:shadow-3xl'
                  }
                `}
              >
                {/* 按钮光效 */}
                {!isLoading && content.trim() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
                
                <div className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      <span>添加中...</span>
                    </>
                  ) : (
                    <>
                      <span className="mr-3 text-2xl">🚀</span>
                      <span>添加到工作篮</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 美化的快捷键提示 */}
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 px-6 py-3 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg backdrop-blur-sm">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-sm">⚡</span>
            </div>
            <span className="font-mono text-gray-800 dark:text-gray-200 font-bold text-base">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
            </span>
            <span className="text-gray-600 dark:text-gray-400 font-medium">快速提交</span>
          </div>
        </div>

        {/* 错误提示 */}
        {captureError && (
          <div className="p-6 bg-gradient-to-r from-red-50 via-red-50 to-pink-50 dark:from-red-900/20 dark:via-red-800/20 dark:to-pink-900/20 border border-red-200 dark:border-red-700 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 text-red-500 mr-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-base text-red-700 dark:text-red-400 font-semibold">
                  {captureError}
                </p>
              </div>
              <button
                onClick={clearCaptureError}
                className="ml-4 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-all duration-200 p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transform hover:scale-110"
                title="关闭错误提示"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuickInput;