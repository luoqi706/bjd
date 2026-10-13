import React, { useState, useMemo } from 'react';
import { Search, Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { DollItem, ItemStatus } from '../types';
import { formatCurrency } from '../utils/formatters';
import { getStoredTags, saveStoredTags } from '../utils/storage';

interface CabinetViewProps {
  items: DollItem[];
  onOpenCreate: () => void;
  onSelectItem: (item: DollItem) => void;
}

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'owned', label: '已拥有' },
  { value: 'pending_final', label: '待付尾款' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'resold', label: '已转卖' },
];

export const CabinetView: React.FC<CabinetViewProps> = ({
  items,
  onSelectItem,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 状态筛选：全部 (all) 或 4个状态之一
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');

  // Tag 筛选：支持多选，当前已生效的 Tag 列表 (空数组表示全部，无筛选)
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Tag 筛选弹窗内临时选中的 Tag 列表
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // 所有可用 Tag 列表 (支持自定义添加)
  const [allTags, setAllTags] = useState<string[]>(() => getStoredTags());
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // 打开 Tag 筛选弹窗
  const handleOpenTagModal = () => {
    setTempTags([...activeTags]);
    setIsAddingTag(false);
    setNewTagInput('');
    setIsTagModalOpen(true);
  };

  // 切换单个 Tag 的临时选中状态 (多选)
  const handleToggleTempTag = (t: string) => {
    setTempTags((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  // 移除单个已生效的 Tag
  const handleRemoveActiveTag = (t: string) => {
    setActiveTags((prev) => prev.filter((item) => item !== t));
  };

  // 弹窗中添加新 Tag
  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!allTags.includes(trimmed)) {
      const updated = [...allTags, trimmed];
      setAllTags(updated);
      saveStoredTags(updated);
    }
    // 自动勾选新建的 tag
    setTempTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setNewTagInput('');
    setIsAddingTag(false);
  };

  // 弹窗确认
  const handleConfirmTagModal = () => {
    setActiveTags([...tempTags]);
    setIsTagModalOpen(false);
  };

  // 弹窗重置 (清空临时选择)
  const handleResetTagModal = () => {
    setTempTags([]);
  };

  // 综合过滤娃物，并严格按从新到旧排序 (最新在最上，最开始录入在最下)
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      // 关键字
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(kw);
        const matchNotes = (item.notes || '').toLowerCase().includes(kw);
        const matchBrand = (item.brand || '').toLowerCase().includes(kw);
        if (!matchName && !matchNotes && !matchBrand) return false;
      }
      // 状态
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Tag 多选过滤：若选中了 tag，则当前娃物的 tag 必须在选中列表中
      if (activeTags.length > 0 && !activeTags.includes(item.tag)) {
        return false;
      }
      return true;
    });

    // 娃物页面严格从上到下按新到旧排序 (最新录入在最上方，最开始录入在最下方)
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.createdAt || 0).getTime() || 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return 0;
    });
  }, [items, searchKeyword, statusFilter, activeTags]);

  // 当物品按照 tag 筛选后，计算所有 tag 中娃物的总金额 (严格使用娃柜金额 cabinetPrice，而非账本记录金额)
  const totalCabinetPrice = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const price = typeof item.cabinetPrice === 'number' ? item.cabinetPrice : 0;
      const qty = typeof item.cabinetQuantity === 'number' && item.cabinetQuantity > 0 ? item.cabinetQuantity : 1;
      return acc + price * qty;
    }, 0);
  }, [filteredItems]);

  return (
    <div className="space-y-3 pb-16">
      {/* 
        搜索栏：最右边放置一个SVG图标（Tag图标）
        当有进行tag筛选的时候变色，没有的时候恢复默认色
      */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--theme-text-muted)]" />
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="搜索娃物名称..."
          className="w-full pl-8 pr-10 py-2 rounded-xl text-xs glass-input text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
        />

        {/* 搜索框最右边的SVG图标：点击打开Tag筛选弹窗 */}
        <button
          onClick={handleOpenTagModal}
          className={`absolute right-2 top-1.5 p-1 rounded-lg transition-colors cursor-pointer ${
            activeTags.length > 0
              ? 'text-[var(--theme-primary)] bg-[var(--theme-primary-light)] ring-1 ring-[var(--theme-primary)]/40'
              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
          }`}
          title={activeTags.length > 0 ? `已筛选 ${activeTags.length} 个Tag: ${activeTags.join(', ')}` : '选择Tag筛选'}
        >
          <TagIcon className="w-4 h-4" />
        </button>
      </div>

      {/* 
        在搜索框下面增加一排横向的按钮：娃物的4个状态，点击筛选
      */}
      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_OPTIONS.map((st) => {
          const isSelected = statusFilter === st.value;
          return (
            <button
              key={st.value}
              onClick={() => setStatusFilter(isSelected ? 'all' : st.value)}
              className={`py-1.5 px-1 rounded-xl text-xs text-center font-medium transition-all truncate cursor-pointer ${
                isSelected
                  ? 'bg-[var(--theme-primary)] text-white shadow-2xs font-semibold'
                  : 'bg-white/80 text-[var(--theme-text)] border border-[var(--theme-border)] hover:bg-white'
              }`}
            >
              {st.label}
            </button>
          );
        })}
      </div>

      {/* 当物品按照 tag 筛选后，在筛选后的页面显示所有所选 tag 中娃物的总金额 (娃柜金额) */}
      {activeTags.length > 0 && (
        <div className="p-2.5 rounded-2xl bg-[var(--theme-primary-light)] border border-[var(--theme-border)] text-xs text-[var(--theme-text)] space-y-2 shadow-2xs animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="text-[11px] text-[var(--theme-text-muted)] shrink-0 font-medium">已选 Tag:</span>
              <div className="flex flex-wrap gap-1">
                {activeTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white text-[var(--theme-primary)] border border-[var(--theme-border)] shadow-2xs"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveActiveTag(t)}
                      className="hover:text-red-500 cursor-pointer"
                      title={`取消筛选 ${t}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setActiveTags([])}
              className="text-[11px] text-[var(--theme-primary)] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer font-medium"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--theme-border)]/50 flex items-center justify-between">
            <span className="text-[11px] text-[var(--theme-text-muted)]">
              当前展示共 {filteredItems.length} 件娃物
            </span>
            <div className="text-xs font-medium text-[var(--theme-text)] flex items-center gap-1">
              <span>娃柜总金额：</span>
              <span className="font-mono font-bold text-sm text-[var(--theme-primary)] tabular-nums">
                {formatCurrency(totalCabinetPrice)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 娃物陈列网格：严格一行3个 (grid-cols-3)，完美适配手机端 */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-white/50 text-[var(--theme-text-muted)] text-xs space-y-2">
          <p>暂无符合筛选条件的娃物</p>
          {(statusFilter !== 'all' || activeTags.length > 0 || searchKeyword) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setActiveTags([]);
                setSearchKeyword('');
              }}
              className="text-xs text-[var(--theme-primary)] font-medium underline cursor-pointer"
            >
              重置所有筛选
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="cursor-pointer rounded-xl bg-white/80 hover:bg-white border border-white/70 shadow-2xs overflow-hidden flex flex-col active:scale-[0.98] transition-all"
            >
              {/* 正方形缩略图 */}
              <div className="w-full aspect-square bg-[#E8ECE8] overflow-hidden">
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  className="w-full h-full aspect-square object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* 仅显示名字与娃柜价格 */}
              <div className="p-1.5 flex flex-col justify-between gap-0.5">
                <div 
                  className="text-xs font-medium text-[var(--theme-text)] truncate"
                  title={item.name}
                >
                  {item.name}
                </div>

                <div className="font-mono text-[11px] font-semibold text-[var(--theme-primary)] tabular-nums truncate">
                  {item.cabinetPrice !== null ? formatCurrency(item.cabinetPrice) : '¥ 0.00'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 
        Tag 筛选弹窗：
        显示各种各样的Tag，后面跟一个小小的加号(+)可以自定义新建tag。
        底部并列放置两个按钮：【重置】与【确定】
      */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-sm rounded-3xl glass-panel p-5 shadow-2xl border border-white/80 text-[var(--theme-text)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--theme-border)]/50 pb-2.5">
              <div>
                <h3 className="text-sm font-serif-sc font-bold text-[var(--theme-text)]">
                  选择物品 Tag 筛选
                </h3>
                <p className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
                  支持多选标签，点击可切换选中状态
                </p>
              </div>
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] rounded-full hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tag 标签网格 (支持多选) */}
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
              {allTags.map((t) => {
                const isSelected = tempTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTempTag(t)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--theme-primary)] text-white shadow-2xs font-semibold'
                        : 'bg-white/80 text-[var(--theme-text)] border border-[var(--theme-border)] hover:bg-white'
                    }`}
                  >
                    <span>{t}</span>
                    {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                  </button>
                );
              })}

              {/* 
                在所有的 tag 标签后面，增加一个 SVG 图标的小小的加号 (+)
                点击可以自定义新建 tag
              */}
              <button
                type="button"
                onClick={() => setIsAddingTag(!isAddingTag)}
                className="px-2.5 py-1.5 rounded-xl border border-dashed border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="新建自定义Tag"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建</span>
              </button>
            </div>

            {/* 新建 Tag 输入框 */}
            {isAddingTag && (
              <form onSubmit={handleAddNewTag} className="flex items-center gap-2 pt-1 animate-fade-in">
                <input
                  type="text"
                  autoFocus
                  required
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="输入新 Tag 名称..."
                  className="flex-1 px-3 py-1.5 text-xs glass-input rounded-xl text-[var(--theme-text)]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-[var(--theme-primary)] text-white rounded-xl shrink-0 cursor-pointer"
                >
                  添加
                </button>
              </form>
            )}

            {/* 弹窗底部：重置与确定两个按钮并列 */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--theme-border)]/50">
              <button
                type="button"
                onClick={handleResetTagModal}
                className="w-full py-2 text-xs font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] bg-white/70 hover:bg-white border border-[var(--theme-border)] rounded-xl transition-colors cursor-pointer"
              >
                重置
              </button>
              <button
                type="button"
                onClick={handleConfirmTagModal}
                className="w-full py-2 text-xs font-semibold text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {tempTags.length > 0 ? `确定 (${tempTags.length})` : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
