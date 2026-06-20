import React, { useState } from 'react';
import { Card, Switch, Tag, Button, Input, Picker, Dialog, Toast, Stepper } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { calculateDiscounts, validateDiscountStacking } from '../core/discountEngine';
import { formatMoney } from '../core/reconciliator';
import type { DiscountRule, DiscountType } from '../core/types';

const typeLabel: Record<DiscountType, string> = {
  COUPON: '优惠券',
  FULL_REDUCTION: '满减',
  PERCENTAGE: '折扣',
  FIXED: '固定优惠',
};

const typeColor: Record<DiscountType, string> = {
  COUPON: '#1677ff',
  FULL_REDUCTION: '#ff8f1f',
  PERCENTAGE: '#00b578',
  FIXED: '#722ed1',
};

const DiscountConfig: React.FC = () => {
  const { discountRules, discountOrder, toggleDiscountRule, updateDiscountOrder, addDiscountRule } = useRentStore();
  const [previewAmount, setPreviewAmount] = useState<number>(4500);
  const [dragOrder, setDragOrder] = useState<string[]>(discountOrder.order.length > 0 ? discountOrder.order : discountRules.map((r) => r.id));
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState<Partial<DiscountRule>>({
    type: 'COUPON',
    enabled: true,
    priority: discountRules.length + 1,
  });

  const sortedRules = [...discountRules].sort((a, b) => {
    const ai = dragOrder.indexOf(a.id);
    const bi = dragOrder.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const previewResult = calculateDiscounts(previewAmount, discountRules, { ...discountOrder, order: dragOrder });

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...dragOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setDragOrder(newOrder);
    updateDiscountOrder(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedRules.length - 1) return;
    const newOrder = [...dragOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setDragOrder(newOrder);
    updateDiscountOrder(newOrder);
  };

  const handleAddRule = () => {
    if (!newRule.name || !newRule.type) {
      Toast.show('请填写完整信息');
      return;
    }
    const id = `DR${Date.now()}`;
    const rule: DiscountRule = {
      id,
      name: newRule.name!,
      type: newRule.type!,
      priority: newRule.priority ?? discountRules.length + 1,
      enabled: true,
      config: newRule.type === 'COUPON'
        ? { amount: 100, minSpend: 1000, validFrom: '2025-01-01', validTo: '2026-12-31' }
        : newRule.type === 'FULL_REDUCTION'
          ? { threshold: 3000, reduction: 200, stackable: true }
          : newRule.type === 'PERCENTAGE'
            ? { percent: 10, maxDiscount: 500, minSpend: 2000 }
            : { amount: 100 },
    };
    addDiscountRule(rule);
    setDragOrder([...dragOrder, id]);
    setShowAdd(false);
    setNewRule({ type: 'COUPON', enabled: true, priority: discountRules.length + 2 });
    Toast.show('添加成功');
  };

  const handleValidate = () => {
    const result = validateDiscountStacking(previewAmount, discountRules, { ...discountOrder, order: dragOrder });
    if (result.valid) {
      Dialog.alert({ content: `✅ 校验通过\n最终金额: ${formatMoney(result.result.finalAmount)}` });
    } else {
      Dialog.alert({ content: `⚠️ ${result.message}\n最终金额: ${formatMoney(result.result.finalAmount)}` });
    }
  };

  return (
    <div className="page-discount">
      <div className="section-title">优惠试算</div>
      <Card className="preview-card">
        <div className="preview-input-row">
          <span>输入租金</span>
          <Stepper
            value={previewAmount}
            onChange={(v) => setPreviewAmount(v)}
            min={0}
            step={100}
            style={{ width: 140 }}
          />
        </div>
        <div className="preview-result">
          <div className="preview-row">
            <span>原始金额</span>
            <span>{formatMoney(previewResult.originalAmount)}</span>
          </div>
          {previewResult.steps.map((step, i) => (
            <div key={i} className="preview-row discount-step">
              <span>{step.ruleName}</span>
              <span className="discount-amount">-{formatMoney(step.discountAmount)}</span>
            </div>
          ))}
          <div className="preview-row total">
            <span>最终金额</span>
            <span className="final-amount">{formatMoney(previewResult.finalAmount)}</span>
          </div>
          {previewResult.negFloorApplied && (
            <div className="neg-warning">⚠️ 优惠叠加后为负，已兜底为0</div>
          )}
        </div>
        <Button size="small" color="primary" fill="outline" onClick={handleValidate} style={{ marginTop: 8 }}>
          负值兜底校验
        </Button>
      </Card>

      <div className="section-title">优惠规则（拖动调整顺序）</div>
      {sortedRules.map((rule, index) => (
        <Card key={rule.id} className={`rule-card ${!rule.enabled ? 'disabled' : ''}`}>
          <div className="rule-header">
            <div className="rule-title-row">
              <span className="rule-priority">#{index + 1}</span>
              <span className="rule-name">{rule.name}</span>
              <Tag color={typeColor[rule.type]} fill="outline" style={{ marginLeft: 8 }}>
                {typeLabel[rule.type]}
              </Tag>
            </div>
            <Switch
              checked={rule.enabled}
              onChange={() => toggleDiscountRule(rule.id)}
            />
          </div>
          {rule.enabled && (
            <div className="rule-detail">
              {rule.type === 'COUPON' && (
                <div className="rule-config-row">
                  <span>面额: {formatMoney((rule.config as { amount: number }).amount)}</span>
                  <span>门槛: {formatMoney((rule.config as { minSpend: number }).minSpend)}</span>
                </div>
              )}
              {rule.type === 'FULL_REDUCTION' && (
                <div className="rule-config-row">
                  <span>满{(rule.config as { threshold: number }).threshold}减{(rule.config as { reduction: number }).reduction}</span>
                </div>
              )}
              {rule.type === 'PERCENTAGE' && (
                <div className="rule-config-row">
                  <span>{(rule.config as { percent: number }).percent}%折 最高减{formatMoney((rule.config as { maxDiscount: number }).maxDiscount)}</span>
                </div>
              )}
              {rule.type === 'FIXED' && (
                <div className="rule-config-row">
                  <span>固定减免: {formatMoney((rule.config as { amount: number }).amount)}</span>
                </div>
              )}
              <div className="rule-actions">
                <Button size="mini" fill="outline" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                  ↑ 上移
                </Button>
                <Button size="mini" fill="outline" disabled={index === sortedRules.length - 1} onClick={() => handleMoveDown(index)}>
                  ↓ 下移
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}

      <Button block color="primary" fill="outline" onClick={() => setShowAdd(true)} style={{ marginTop: 12 }}>
        + 添加优惠规则
      </Button>

      {showAdd && (
        <Dialog
          visible={showAdd}
          title="添加优惠规则"
          content={
            <div className="add-rule-form">
              <div className="form-item">
                <span>规则名称</span>
                <Input
                  placeholder="输入规则名称"
                  value={newRule.name ?? ''}
                  onChange={(v) => setNewRule({ ...newRule, name: v })}
                />
              </div>
              <div className="form-item">
                <span>规则类型</span>
                <Picker
                  columns={[
                    [
                      { label: '优惠券', value: 'COUPON' },
                      { label: '满减', value: 'FULL_REDUCTION' },
                      { label: '折扣', value: 'PERCENTAGE' },
                      { label: '固定优惠', value: 'FIXED' },
                    ],
                  ]}
                  visible={showAdd}
                  onConfirm={(v) => setNewRule({ ...newRule, type: v[0] as DiscountType })}
                >
                  {(_, actions) => (
                    <Button size="small" fill="outline" onClick={actions.open}>
                      {typeLabel[newRule.type ?? 'COUPON']}
                    </Button>
                  )}
                </Picker>
              </div>
            </div>
          }
          closeOnAction
          onClose={() => setShowAdd(false)}
          actions={[
            { key: "cancel", text: "取消", onClick: () => setShowAdd(false) },
            { key: "confirm", text: "确认", bold: true, onClick: handleAddRule },
          ]}
        />
      )}
    </div>
  );
};

export default DiscountConfig;
