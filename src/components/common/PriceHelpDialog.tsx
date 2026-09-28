import { useEffect } from 'react';
import { PROCESSING_FEE_EXAMPLE } from '../../utils/processingFees';
import { useBackdropClick } from './useBackdropClick';

interface PriceHelpDialogProps { onClose: () => void; }

export function PriceHelpDialog({ onClose }: PriceHelpDialogProps) {
  const backdropClickHandlers = useBackdropClick(onClose);
  const example = PROCESSING_FEE_EXAMPLE;
  const fee = Math.min(example.fixedFee + example.inputTotal * example.ratePercent / 100, example.cap);
  const total = example.inputTotal + fee;

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div className="dialog-overlay" {...backdropClickHandlers}>
      <div className="dialog price-help-dialog" role="dialog" aria-modal="true" aria-labelledby="price-help-title" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 id="price-help-title">🧮 费用如何计算</h2>
          <button className="dialog-close" onClick={onClose} aria-label="关闭费用计算说明" autoFocus>×</button>
        </div>
        <div className="dialog-body price-help-content">
          <section><h3>物品价格</h3><p>自动计算价格来自配方；手动覆盖价格由你填写。两者都有时，后续配方优先使用手动价。</p></section>
          <section><h3>输入与附加物</h3><p>有价格的输入和附加物都会按“单价 × 数量”加入本批成本。没有价格的物品暂时忽略；标签采用其中最低的有效成员价格。</p></section>
          <section><h3>工作方块加工费</h3><p>每批加工费由固定费和输入总价的一定百分比组成；设置上限后不会超过该数值。固定费按整批收取，因此一次产出越多，单件分摊越低。</p></section>
          <section><h3>多种成品</h3><p>本批总价先按成品种类分配，同一种成品再按实际数量平分。已有手动价的成品先从总价中扣除。</p></section>
          <section><h3>多道工序与反推</h3><p>半成品价格会作为下一道工序的输入价格，因此前序费用自然进入最终成品。只有一个普通输入且有多个已知价输出时，系统才会扣除当前加工费后反推原料价格。</p></section>
          <div className="price-example">
            <strong>示例</strong>
            <p>输入总价 {example.inputTotal}，固定费 {example.fixedFee}，费率 {example.ratePercent}%，上限 {example.cap}</p>
            <p>加工费 = min({example.fixedFee} + {example.inputTotal} × {example.ratePercent}%, {example.cap}) = {fee}</p>
            <p>本批成品总价 = {total}；若产出 {example.outputCount} 个相同成品，自动单价 = {total / example.outputCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
