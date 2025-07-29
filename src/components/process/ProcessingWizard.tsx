/**
 * 处理向导组件
 * 实现GTD处理流程的步骤式界面
 */

import React, { useState, useEffect } from 'react';
import { useGTDStore } from '../../store/gtd-store';
import { ActionType, Priority } from '../../types/enums';
import type { InboxItem, ProcessDecision } from '../../types/interfaces';
import {
  shouldDoImmediately,
  validateProcessDecision,
  getActionableOptions,
  getNonActionableOptions,
  suggestActionType,
} from '../../utils/classification';

interface ProcessingWizardProps {
  item: InboxItem;
  onComplete: () => void;
  onCancel: () => void;
}

const ProcessingStep = {
  WHAT_IS_IT: 'what_is_it',
  IS_ACTIONABLE: 'is_actionable',
  TWO_MINUTE_RULE: 'two_minute_rule',
  CATEGORIZE: 'categorize',
  CONFIRM: 'confirm',
} as const;

type ProcessingStep = (typeof ProcessingStep)[keyof typeof ProcessingStep];

export const ProcessingWizard: React.FC<ProcessingWizardProps> = ({
  item,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>(
    ProcessingStep.WHAT_IS_IT
  );
  const [decision, setDecision] = useState<Partial<ProcessDecision>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { processItem, contexts, processError, clearProcessError } =
    useGTDStore();

  useEffect(() => {
    clearProcessError();
  }, [clearProcessError]);

  const handleStepComplete = (stepData: Partial<ProcessDecision>) => {
    const updatedDecision = { ...decision, ...stepData };
    setDecision(updatedDecision);

    // 根据当前步骤决定下一步
    switch (currentStep) {
      case ProcessingStep.WHAT_IS_IT:
        setCurrentStep(ProcessingStep.IS_ACTIONABLE);
        break;
      case ProcessingStep.IS_ACTIONABLE:
        if (updatedDecision.isActionable) {
          setCurrentStep(ProcessingStep.TWO_MINUTE_RULE);
        } else {
          setCurrentStep(ProcessingStep.CATEGORIZE);
        }
        break;
      case ProcessingStep.TWO_MINUTE_RULE:
        if (updatedDecision.timeEstimate && updatedDecision.timeEstimate <= 2) {
          // 2分钟内可完成，直接执行
          setDecision((prev) => ({ ...prev, actionType: ActionType.DO }));
          setCurrentStep(ProcessingStep.CONFIRM);
        } else {
          setCurrentStep(ProcessingStep.CATEGORIZE);
        }
        break;
      case ProcessingStep.CATEGORIZE:
        setCurrentStep(ProcessingStep.CONFIRM);
        break;
    }
  };

  const handleConfirm = async () => {
    if (!decision.actionType) return;

    // 验证决策完整性
    const validation = validateProcessDecision(decision);
    if (!validation.isValid) {
      console.error('决策验证失败:', validation.errors);
      return;
    }

    setIsProcessing(true);
    try {
      await processItem(item.id, decision as ProcessDecision);
      onComplete();
    } catch (error) {
      console.error('处理项目失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case ProcessingStep.IS_ACTIONABLE:
        setCurrentStep(ProcessingStep.WHAT_IS_IT);
        break;
      case ProcessingStep.TWO_MINUTE_RULE:
        setCurrentStep(ProcessingStep.IS_ACTIONABLE);
        break;
      case ProcessingStep.CATEGORIZE:
        if (decision.isActionable) {
          setCurrentStep(ProcessingStep.TWO_MINUTE_RULE);
        } else {
          setCurrentStep(ProcessingStep.IS_ACTIONABLE);
        }
        break;
      case ProcessingStep.CONFIRM:
        setCurrentStep(ProcessingStep.CATEGORIZE);
        break;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case ProcessingStep.WHAT_IS_IT:
        return <WhatIsItStep item={item} onComplete={handleStepComplete} />;
      case ProcessingStep.IS_ACTIONABLE:
        return <IsActionableStep item={item} onComplete={handleStepComplete} />;
      case ProcessingStep.TWO_MINUTE_RULE:
        return (
          <TwoMinuteRuleStep item={item} onComplete={handleStepComplete} />
        );
      case ProcessingStep.CATEGORIZE:
        return (
          <CategorizeStep
            item={item}
            isActionable={decision.isActionable || false}
            contexts={contexts}
            onComplete={handleStepComplete}
          />
        );
      case ProcessingStep.CONFIRM:
        return (
          <ConfirmStep
            item={item}
            decision={decision as ProcessDecision}
            onConfirm={handleConfirm}
            isProcessing={isProcessing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 头部 */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              处理工作篮项目
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 进度指示器 */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>
                步骤 {Object.values(ProcessingStep).indexOf(currentStep) + 1} /{' '}
                {Object.values(ProcessingStep).length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                role="progressbar"
                aria-valuenow={
                  ((Object.values(ProcessingStep).indexOf(currentStep) + 1) /
                    Object.values(ProcessingStep).length) *
                  100
                }
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  width: `${((Object.values(ProcessingStep).indexOf(currentStep) + 1) / Object.values(ProcessingStep).length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 错误提示 */}
          {processError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{processError}</p>
            </div>
          )}

          {/* 当前步骤内容 */}
          {renderStep()}

          {/* 底部按钮 */}
          <div className="flex justify-between mt-6">
            <button
              onClick={
                currentStep === ProcessingStep.WHAT_IS_IT
                  ? onCancel
                  : handleBack
              }
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              {currentStep === ProcessingStep.WHAT_IS_IT ? '取消' : '上一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 步骤组件
interface StepProps {
  item: InboxItem;
  onComplete: (data: Partial<ProcessDecision>) => void;
}

const WhatIsItStep: React.FC<StepProps> = ({ item, onComplete }) => {
  const [description, setDescription] = useState('');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">这是什么？</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-gray-700">{item.content}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          详细描述（可选）
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="为这个项目添加更详细的描述..."
        />
      </div>
      <button
        onClick={() => onComplete({ notes: description })}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        继续
      </button>
    </div>
  );
};

const IsActionableStep: React.FC<StepProps> = ({ item, onComplete }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">需要行动吗？</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-gray-700">{item.content}</p>
      </div>
      <p className="text-gray-600">这个项目是否需要你采取具体的行动？</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onComplete({ isActionable: true })}
          className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
        >
          <div className="text-green-600 font-medium">是，需要行动</div>
          <div className="text-sm text-gray-500 mt-1">需要我做些什么</div>
        </button>
        <button
          onClick={() => onComplete({ isActionable: false })}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          <div className="text-gray-600 font-medium">不，不需要行动</div>
          <div className="text-sm text-gray-500 mt-1">仅供参考或备忘</div>
        </button>
      </div>
    </div>
  );
};

const TwoMinuteRuleStep: React.FC<StepProps> = ({ item, onComplete }) => {
  const [timeEstimate, setTimeEstimate] = useState<number>(5);
  const shouldDoNow = shouldDoImmediately(timeEstimate);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">预估完成时间</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-gray-700">{item.content}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          完成这个任务大约需要多长时间？（分钟）
        </label>
        <input
          type="number"
          value={timeEstimate}
          onChange={(e) => setTimeEstimate(Number(e.target.value))}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="1"
          max="480"
        />
      </div>
      {shouldDoNow && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 font-medium">2分钟规则：立即执行！</p>
          <p className="text-sm text-green-600 mt-1">
            既然只需要2分钟或更少时间，建议立即完成这个任务。
          </p>
        </div>
      )}
      <button
        onClick={() => onComplete({ timeEstimate })}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        继续
      </button>
    </div>
  );
};

interface CategorizeStepProps extends StepProps {
  isActionable: boolean;
  contexts: any[];
}

const CategorizeStep: React.FC<CategorizeStepProps> = ({
  item,
  isActionable,
  contexts,
  onComplete,
}) => {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);

  // 使用分类工具获取选项
  const options = isActionable
    ? getActionableOptions()
    : getNonActionableOptions();

  // 获取智能建议
  const suggestion = suggestActionType(item.content);

  // 如果还没有选择，显示建议
  const showSuggestion = !selectedAction && suggestion.confidence > 0.5;

  const handleSubmit = () => {
    if (!selectedAction) return;

    const data: Partial<ProcessDecision> = {
      actionType: selectedAction,
      priority,
    };

    if (isActionable && selectedAction !== ActionType.DELETE) {
      data.context = selectedContext;
    }

    onComplete(data);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {isActionable ? '如何处理这个行动？' : '如何分类这个项目？'}
      </h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-gray-700">{item.content}</p>
      </div>

      {/* 智能建议 */}
      {showSuggestion && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700 font-medium">💡 智能建议</p>
          <p className="text-sm text-blue-600 mt-1">
            建议选择"
            {
              [...getActionableOptions(), ...getNonActionableOptions()].find(
                (o) => o.type === suggestion.actionType
              )?.label
            }
            " - {suggestion.reason}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.type}
            onClick={() => setSelectedAction(option.type)}
            className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
              selectedAction === option.type
                ? 'border-blue-400 bg-blue-50'
                : suggestion.actionType === option.type && showSuggestion
                  ? 'border-blue-200 bg-blue-25'
                  : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900">{option.label}</div>
              {suggestion.actionType === option.type && showSuggestion && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  推荐
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {option.description}
            </div>
          </button>
        ))}
      </div>

      {isActionable &&
        selectedAction &&
        selectedAction !== ActionType.DELETE && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label
                htmlFor="context-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                选择情境
              </label>
              <select
                id="context-select"
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="选择情境"
              >
                <option value="">选择情境...</option>
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="priority-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                优先级
              </label>
              <select
                id="priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="优先级"
              >
                <option value={Priority.LOW}>低</option>
                <option value={Priority.MEDIUM}>中</option>
                <option value={Priority.HIGH}>高</option>
                <option value={Priority.URGENT}>紧急</option>
              </select>
            </div>
          </div>
        )}

      <button
        onClick={handleSubmit}
        disabled={
          !selectedAction ||
          (isActionable &&
            selectedAction !== ActionType.DELETE &&
            !selectedContext)
        }
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        继续
      </button>
    </div>
  );
};

interface ConfirmStepProps {
  item: InboxItem;
  decision: ProcessDecision;
  onConfirm: () => void;
  isProcessing: boolean;
}

const ConfirmStep: React.FC<ConfirmStepProps> = ({
  item,
  decision,
  onConfirm,
  isProcessing,
}) => {
  const { contexts } = useGTDStore();

  const getActionTypeLabel = (type: ActionType) => {
    const labels = {
      [ActionType.DO]: '立即执行',
      [ActionType.DELEGATE]: '委派他人',
      [ActionType.DEFER]: '延迟处理',
      [ActionType.DELETE]: '删除',
      [ActionType.REFERENCE]: '参考资料',
      [ActionType.SOMEDAY]: '将来/也许',
    };
    return labels[type];
  };

  const getPriorityLabel = (priority: Priority) => {
    const labels = {
      [Priority.LOW]: '低',
      [Priority.MEDIUM]: '中',
      [Priority.HIGH]: '高',
      [Priority.URGENT]: '紧急',
    };
    return labels[priority];
  };

  const getContextName = (contextId: string) => {
    const context = contexts.find((c) => c.id === contextId);
    return context ? context.name : contextId;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">确认处理决策</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-gray-700">{item.content}</p>
      </div>

      <div className="bg-blue-50 p-4 rounded-md space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">处理方式：</span>
          <span className="font-medium">
            {getActionTypeLabel(decision.actionType)}
          </span>
        </div>
        {decision.isActionable && (
          <>
            {decision.context && (
              <div className="flex justify-between">
                <span className="text-gray-600">情境：</span>
                <span className="font-medium">
                  {getContextName(decision.context)}
                </span>
              </div>
            )}
            {decision.priority && (
              <div className="flex justify-between">
                <span className="text-gray-600">优先级：</span>
                <span className="font-medium">
                  {getPriorityLabel(decision.priority)}
                </span>
              </div>
            )}
            {decision.timeEstimate && (
              <div className="flex justify-between">
                <span className="text-gray-600">预估时间：</span>
                <span className="font-medium">
                  {decision.timeEstimate} 分钟
                </span>
              </div>
            )}
          </>
        )}
        {decision.notes && (
          <div>
            <span className="text-gray-600">备注：</span>
            <p className="text-gray-800 mt-1">{decision.notes}</p>
          </div>
        )}
      </div>

      <button
        onClick={onConfirm}
        disabled={isProcessing}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? '处理中...' : '确认处理'}
      </button>
    </div>
  );
};
