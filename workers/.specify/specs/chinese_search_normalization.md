# BDD Spec: Chinese Traditional/Simplified Search Normalization

## Feature
As a user searching for business cards,
I want to find cards regardless of traditional/simplified Chinese input,
So that I don't miss results due to character variants.

## Background
- Current issue: Searching "奧義智慧" (traditional) only finds 4 cards, missing "洪健復" (simplified "奥")
- Root cause: Database has mixed traditional/simplified characters
- Solution: Normalize organization names to traditional Chinese at write time

## Scenario 1: Database Schema Extension
**Given** the received_cards table exists
**When** migration 0034 is applied
**Then** a new column `organization_normalized TEXT` should exist
**And** an index `idx_organization_normalized` should be created
**And** existing data should remain unchanged (backfill separately)

## Scenario 2: Lightweight Chinese Converter
**Given** a new utility file `src/utils/chinese-converter.ts`
**When** `normalizeToTraditional("奥義智慧科技")` is called
**Then** it should return "奧義智慧科技"
**And** the function should handle 50+ common simplified characters
**And** characters without mappings should remain unchanged
**And** null/undefined input should return as-is

### Common Character Mappings (Minimum Required)
```
奥→奧, 义→義, 国→國, 际→際, 资→資, 讯→訊, 电→電, 脑→腦,
软→軟, 硬→硬, 件→件, 体→體, 业→業, 务→務, 产→產, 品→品,
发→發, 开→開, 关→關, 门→門, 问→問, 题→題, 时→時, 间→間,
学→學, 习→習, 实→實, 验→驗, 经→經, 营→營, 销→銷, 售→售,
购→購, 买→買, 卖→賣, 货→貨, 币→幣, 银→銀, 行→行, 证→證,
书→書, 报→報, 纸→紙, 笔→筆, 记→記, 录→錄, 号→號, 码→碼
```

## Scenario 3: Write-Time Normalization (Manual Input)
**Given** a user creates a card via POST /api/user/received-cards
**And** the request body contains `organization: "奥義智慧科技"`
**When** the card is inserted into the database
**Then** `organization` should be stored as "奥義智慧科技" (original)
**And** `organization_normalized` should be stored as "奧義智慧科技" (normalized)

## Scenario 4: Write-Time Normalization (OCR Flow)
**Given** a user uploads a business card image
**And** OCR extracts `organization: "奥義智慧科技"`
**When** unified-extract.ts processes the data
**Then** both `organization` and `organization_normalized` should be populated
**And** `organization_normalized` should use traditional characters

## Scenario 5: Search with Traditional Input
**Given** 5 cards exist with organization names:
  - "奧義智慧科技" (叢培侃, 王筱英, 白佩玉, 羅婉麗)
  - "奥義智慧科技" (洪健復)
**And** all cards have `organization_normalized` = "奧義智慧科技"
**When** user searches with query "奧義智慧"
**Then** the search should query `organization_normalized LIKE '%奧義智慧%'`
**And** all 5 cards should be returned

## Scenario 6: Search with Simplified Input
**Given** the same 5 cards as Scenario 5
**When** user searches with query "奥義智慧"
**Then** the query should be normalized to "奧義智慧"
**And** the search should query `organization_normalized LIKE '%奧義智慧%'`
**And** all 5 cards should be returned

## Scenario 7: Backward Compatibility
**Given** existing cards without `organization_normalized` (NULL)
**When** a search is performed
**Then** the search should still work (fallback to `organization`)
**And** no errors should occur

## Technical Constraints
- Bundle size increase: < 5 KB
- No external dependencies (no opencc-js)
- Zero breaking changes to existing API
- TypeScript compilation: zero errors
- Performance: normalization < 1ms per card

## Acceptance Criteria
1. ✅ Migration 0034 creates column and index
2. ✅ chinese-converter.ts handles 50+ characters
3. ✅ crud.ts normalizes on INSERT
4. ✅ unified-extract.ts normalizes OCR results
5. ✅ search.ts queries organization_normalized
6. ✅ Search "奧義智慧" returns 5 cards
7. ✅ Search "奥義智慧" returns 5 cards
8. ✅ Bundle size < 1031 KiB (current 1026 + 5)
9. ✅ TypeScript: zero errors
10. ✅ Existing data unaffected (backfill script provided)
