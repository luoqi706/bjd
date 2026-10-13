import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Check, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { DollItem } from '../types';
import { exportDataAsJSON, parseBackupJSON, resetStoredItems, ParseBackupResult } from '../utils/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DollItem[];
  onImportItems: (items: DollItem[], tags?: string[]) => void;
  onMergeImportItems?: (items: DollItem[], tags?: string[]) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  items,
  onImportItems,
  onMergeImportItems,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 待确认导入的临时解析结果
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    items: DollItem[];
    tags?: string[];
  } | null>(null);

  if (!isOpen) return null;

  // 导出完整数据 (含照片)
  const handleExportFull = () => {
    exportDataAsJSON(items, true);
    setStatusMsg({ text: `完整数据导出成功（含照片），共 ${items.length} 件娃物`, type: 'success' });
  };

  // 导出轻量数据 (仅数据与记录，不含大照片)
  const handleExportLightweight = () => {
    exportDataAsJSON(items, false);
    setStatusMsg({ text: `轻量数据导出成功（仅数据与记录，不含大图），共 ${items.length} 件娃物`, type: 'success' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result: ParseBackupResult = parseBackupJSON(content);

        if (result.success && result.items.length > 0) {
          setPendingImport({
            fileName,
            items: result.items,
            tags: result.tags,
          });
          setStatusMsg({
            text: `已成功解析「${fileName}」，共识别出 ${result.items.length} 件娃物数据。请选择导入方式：`,
            type: 'success',
          });
        } else {
          setPendingImport(null);
          setStatusMsg({
            text: result.error || '未能识别有效的娃物备份数据，请检查文件内容',
            type: 'error',
          });
        }
      } catch (err: any) {
        setPendingImport(null);
        setStatusMsg({
          text: `读取文件失败：${err?.message || '未知错误'}`,
          type: 'error',
        });
      }
    };

    reader.onerror = () => {
      setPendingImport(null);
      setStatusMsg({ text: '读取文件出现异常，请重试', type: 'error' });
    };

    reader.readAsText(file, 'utf-8');
    // 重置 input 以便支持再次选择同一个文件
    e.target.value = '';
  };

  // 覆盖导入
  const handleConfirmOverwrite = () => {
    if (!pendingImport) return;
    onImportItems(pendingImport.items, pendingImport.tags);
    setStatusMsg({
      text: `覆盖导入成功！已更新 ${pendingImport.items.length} 件娃物与账本`,
      type: 'success',
    });
    setPendingImport(null);
  };

  // 合并导入
  const handleConfirmMerge = () => {
    if (!pendingImport) return;
    if (onMergeImportItems) {
      onMergeImportItems(pendingImport.items, pendingImport.tags);
    } else {
      onImportItems([...items, ...pendingImport.items], pendingImport.tags);
    }
    setStatusMsg({
      text: `合并导入成功！已追加 ${pendingImport.items.length} 件娃物数据`,
      type: 'success',
    });
    setPendingImport(null);
  };

  const handleReset = () => {
    if (window.confirm('确定要恢复初始示例数据吗？当前的自定义修改将被示例娃物替换。')) {
      const initial = resetStoredItems();
      onImportItems(initial);
      setPendingImport(null);
      setStatusMsg({ text: '已恢复初始示例娃物与账本', type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md rounded-3xl glass-panel p-6 shadow-2xl border border-white/80 text-[#2D3A32]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#A2B29F]/30">
          <div>
            <h3 className="text-base font-serif-sc font-bold text-[#2D3A32]">
              数据管理与备份
            </h3>
            <p className="text-xs text-[#6F8873]">
              本地持久存储，支持导出、恢复与导入
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6F8873] hover:text-[#2D3A32] rounded-full hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
            statusMsg.type === 'success' 
              ? 'bg-[#EAF1EC] text-[#3D5645] border border-[#BDCEBF]' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* 导入确认操作卡片 */}
        {pendingImport && (
          <div className="mt-4 p-4 rounded-2xl bg-white/90 border-2 border-[#5B7360]/40 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#2D3A32]">
                确认导入备份：{pendingImport.fileName}
              </div>
              <button
                onClick={() => setPendingImport(null)}
                className="text-[11px] text-[#7A8E7E] hover:underline"
              >
                取消
              </button>
            </div>
            <div className="text-[11px] text-[#556B5A] bg-[#EAF1EC] p-2.5 rounded-xl border border-[#BDCEBF]/60">
              共包含 <strong>{pendingImport.items.length}</strong> 件娃物
              {pendingImport.tags ? ` 与 ${pendingImport.tags.length} 个标签` : ''}，请选择导入方式：
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleConfirmOverwrite}
                className="py-2 px-3 text-xs font-semibold text-white bg-[#5B7360] hover:bg-[#4D6352] rounded-xl shadow-xs transition-colors text-center"
              >
                覆盖当前数据
              </button>
              <button
                onClick={handleConfirmMerge}
                className="py-2 px-3 text-xs font-semibold text-[#2D3A32] bg-white hover:bg-[#F3F6F3] border border-[#CBD7CE] rounded-xl shadow-xs transition-colors text-center"
              >
                合并追加至当前
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-0.5">
          {/* 1. 导出完整数据 */}
          <button
            onClick={handleExportFull}
            className="w-full p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-[#CBD7CE] transition-all flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#5B7360]/10 text-[#5B7360] group-hover:bg-[#5B7360] group-hover:text-white transition-colors">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#2D3A32]">
                  导出完整备份 (含照片)
                </div>
                <div className="text-[11px] text-[#7A8E7E]">
                  包含全部 {items.length} 件娃物、图片及账目记录
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#7A8E7E] group-hover:text-[#5B7360] shrink-0 ml-2" />
          </button>

          {/* 2. 导出轻量备份 (仅数据与记录，不含照片) */}
          <button
            onClick={handleExportLightweight}
            className="w-full p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-[#CBD7CE] transition-all flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#6E8272]/10 text-[#6E8272] group-hover:bg-[#6E8272] group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#2D3A32]">
                  导出轻量备份 (仅数据记录，不含照片)
                </div>
                <div className="text-[11px] text-[#7A8E7E]">
                  完整保留所有娃物参数、收支记录与日期，文件小且安全
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#7A8E7E] group-hover:text-[#6E8272] shrink-0 ml-2" />
          </button>

          {/* 3. 导入备份数据 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-[#CBD7CE] transition-all flex items-center justify-between group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#5B798E]/10 text-[#5B798E] group-hover:bg-[#5B798E] group-hover:text-white transition-colors">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#2D3A32]">
                  导入备份数据 (JSON)
                </div>
                <div className="text-[11px] text-[#7A8E7E]">
                  支持完整备份与纯数据备份，智能校验与识别
                </div>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </button>

          {/* 4. 重置示例数据 */}
          <button
            onClick={handleReset}
            className="w-full p-3 rounded-2xl bg-white/50 hover:bg-red-50/70 border border-[#CBD7CE]/70 hover:border-red-200 transition-all flex items-center gap-3 group text-left"
          >
            <div className="p-2 rounded-xl bg-black/5 text-[#7A8E7E] group-hover:text-red-600 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#4A5D4F] group-hover:text-red-700">
                重置为示例数据
              </div>
              <div className="text-[11px] text-[#7A8E7E]">
                恢复初始预设的5件典型BJD藏品
              </div>
            </div>
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-[#A2B29F]/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#5B7360] hover:text-[#2D3A32]"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

