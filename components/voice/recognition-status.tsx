import type { FC } from "react";

type RecognitionStatusProps = {
  currentText: string;
  isProcessing: boolean;
};

export const RecognitionStatus: FC<RecognitionStatusProps> = ({
  currentText,
  isProcessing,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">即時辨識</h3>
        {isProcessing && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span>處理中…</span>
          </div>
        )}
      </div>

      <div className="flex-1 bg-gray-50 rounded-lg p-8 flex items-center justify-center min-h-[200px]">
        {currentText ? (
          <p className="text-2xl font-light text-gray-900 text-center break-words">
            {currentText}
          </p>
        ) : (
          <p className="text-gray-400 text-center text-sm">
            等待語音輸入...
          </p>
        )}
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-xs text-gray-500 font-medium">格式範例</p>
        <div className="space-y-1">
          <p className="text-xs text-gray-400">牛肉麵 120、滷肉飯 50、珍珠奶茶 120 2份</p>
        </div>
      </div>
    </div>
  );
};


