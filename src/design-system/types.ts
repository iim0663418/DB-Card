// moda-01: 設計系統核心類型定義
// Spec Refs: R-009, D-009.1

export interface DesignTokens {
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    neutral: ColorScale;
  };
  typography: TypographyTokens;
  spacing: SpacingScale;
}

export interface ColorScale {
  1: string;  // --md-primary-1: #6868ac
  2: string;  // --md-primary-2: rgba(104, 104, 172, 0.89)
  3: string;  // --md-primary-3: #4e4e81
  4: string;  // --md-primary-4: #a4a4cd
  5: string;  // --md-primary-5: #dbdbeb
}

export interface TypographyTokens {
  fontFamily: string;  // 'PingFang TC', 'Noto Sans TC', sans-serif
  fontWeight: number;  // 300
  fontSize: string;    // 0.875rem
}

export interface SpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface DesignSystemState {
  initialized: boolean;
  tokensLoaded: boolean;
  cssVariablesApplied: boolean;
  loadTime: number;
}

export class DesignSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DesignSystemError';
  }
}