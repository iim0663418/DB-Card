-- Migration 0035: Chinese Variants Auto-Learning Table
-- Purpose: Store simplified-traditional character mappings with auto-learning
-- Date: 2026-03-04

CREATE TABLE IF NOT EXISTS chinese_variants (
  simplified TEXT PRIMARY KEY,
  traditional TEXT NOT NULL,
  learned_at INTEGER NOT NULL,
  source TEXT DEFAULT 'bootstrap' CHECK(source IN ('bootstrap', 'gemini'))
);

CREATE INDEX IF NOT EXISTS idx_learned_at ON chinese_variants(learned_at DESC);

-- Bootstrap with 50 common characters
INSERT INTO chinese_variants (simplified, traditional, learned_at, source) VALUES
  ('奥', '奧', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('义', '義', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('国', '國', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('际', '際', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('资', '資', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('讯', '訊', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('电', '電', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('脑', '腦', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('软', '軟', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('硬', '硬', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('件', '件', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('体', '體', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('业', '業', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('务', '務', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('产', '產', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('品', '品', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('发', '發', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('开', '開', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('关', '關', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('门', '門', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('问', '問', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('题', '題', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('时', '時', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('间', '間', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('学', '學', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('习', '習', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('实', '實', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('验', '驗', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('经', '經', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('营', '營', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('销', '銷', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('售', '售', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('购', '購', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('买', '買', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('卖', '賣', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('货', '貨', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('币', '幣', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('银', '銀', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('行', '行', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('证', '證', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('书', '書', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('报', '報', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('纸', '紙', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('笔', '筆', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('记', '記', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('录', '錄', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('号', '號', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('码', '碼', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('网', '網', strftime('%s', 'now') * 1000, 'bootstrap'),
  ('络', '絡', strftime('%s', 'now') * 1000, 'bootstrap');
