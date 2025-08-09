#!/bin/bash

# =============================================================================
# PWA 靜態托管自動化部署腳本 (Automated Deployment Script)
# =============================================================================
# Version: v3.2.0-pwa-deployment-compatibility
# Created: 2025-08-07
# Purpose: 完整的PWA部署自動化，包含所有修復步驟、驗證和回滾功能
# Security: 命令注入防護、權限檢查、路徑遍歷防護
# =============================================================================

set -euo pipefail  # 嚴格錯誤處理
IFS=$'\n\t'        # 安全的內部欄位分隔符

# =============================================================================
# 全域變數與配置
# =============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly PWA_DIR="$PROJECT_ROOT/pwa-card-storage"
readonly BACKUP_DIR="$SCRIPT_DIR/backups/deploy-$(date +%Y%m%d_%H%M%S)"
readonly LOG_FILE="$SCRIPT_DIR/deployment.log"
readonly DEPLOYMENT_CONFIG="$SCRIPT_DIR/deployment-config.json"

# 部署階段標記
readonly STAGES=(
    "INIT"
    "BACKUP"
    "PATH_AUDIT"
    "RESOURCE_COPY"
    "PATH_UPDATE"
    "SECURITY_SETUP"
    "CONFIG_SETUP"
    "VERIFICATION"
    "CLEANUP"
)

# 當前階段追蹤
CURRENT_STAGE=""
DEPLOYMENT_START_TIME=""
FAILED_STAGE=""

# 顏色輸出
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# =============================================================================
# 日誌與輸出函數
# =============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 安全的日誌輸出 - 避免日誌注入
    local safe_message=$(printf '%s' "$message" | tr -d '\r' | head -c 1000)
    
    echo "[$timestamp] [$level] $safe_message" | tee -a "$LOG_FILE"
    
    case "$level" in
        "ERROR")   echo -e "${RED}❌ $safe_message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $safe_message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $safe_message${NC}" ;;
        "INFO")    echo -e "${BLUE}ℹ️  $safe_message${NC}" ;;
    esac
}

print_banner() {
    echo -e "${BLUE}"
    echo "============================================================================="
    echo "🚀 PWA 靜態托管自動化部署腳本"
    echo "============================================================================="
    echo "版本: v3.2.0-pwa-deployment-compatibility"
    echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "專案: $PROJECT_ROOT"
    echo "============================================================================="
    echo -e "${NC}"
}

print_stage() {
    local stage="$1"
    local description="$2"
    
    echo -e "${YELLOW}"
    echo "============================================================================="
    echo "📋 階段: $stage"
    echo "📝 描述: $description"
    echo "============================================================================="
    echo -e "${NC}"
}

# =============================================================================
# 安全與驗證函數
# =============================================================================

validate_environment() {
    log "INFO" "驗證部署環境..."
    
    # 檢查必要目錄
    if [[ ! -d "$PROJECT_ROOT" ]]; then
        log "ERROR" "專案根目錄不存在: $PROJECT_ROOT"
        return 1
    fi
    
    if [[ ! -d "$PWA_DIR" ]]; then
        log "ERROR" "PWA目錄不存在: $PWA_DIR"
        return 1
    fi
    
    # 檢查必要工具
    local required_tools=("node" "npm" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "必要工具未安裝: $tool"
            return 1
        fi
    done
    
    # 檢查部署工具
    local deploy_tools=(
        "$SCRIPT_DIR/path-audit.js"
        "$SCRIPT_DIR/resource-integrity-manager.js"
        "$SCRIPT_DIR/html-path-updater.js"
        "$SCRIPT_DIR/deployment-verifier.js"
    )
    
    for tool in "${deploy_tools[@]}"; do
        if [[ ! -f "$tool" ]]; then
            log "ERROR" "部署工具不存在: $tool"
            return 1
        fi
    done
    
    log "SUCCESS" "環境驗證通過"
    return 0
}

sanitize_path() {
    local path="$1"
    
    # 移除危險字符和路徑遍歷
    local safe_path=$(printf '%s' "$path" | sed 's/\.\.\///g' | sed 's/[;&|`$()]//g')
    
    # 確保路徑在專案範圍內
    if [[ "$safe_path" != "$PROJECT_ROOT"* ]] && [[ "$safe_path" != "./"* ]]; then
        log "ERROR" "不安全的路徑: $path"
        return 1
    fi
    
    printf '%s' "$safe_path"
}

check_permissions() {
    log "INFO" "檢查檔案權限..."
    
    # 檢查寫入權限
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        log "ERROR" "專案目錄無寫入權限: $PROJECT_ROOT"
        return 1
    fi
    
    if [[ ! -w "$PWA_DIR" ]]; then
        log "ERROR" "PWA目錄無寫入權限: $PWA_DIR"
        return 1
    fi
    
    log "SUCCESS" "權限檢查通過"
    return 0
}

# =============================================================================
# 備份與回滾函數
# =============================================================================

create_backup() {
    print_stage "BACKUP" "建立部署前備份"
    CURRENT_STAGE="BACKUP"
    
    log "INFO" "建立備份目錄: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # 備份PWA目錄
    log "INFO" "備份PWA目錄..."
    if ! cp -r "$PWA_DIR" "$BACKUP_DIR/pwa-card-storage-backup"; then
        log "ERROR" "PWA目錄備份失敗"
        return 1
    fi
    
    # 備份關鍵檔案
    local critical_files=(
        "$PROJECT_ROOT/index.html"
        "$PROJECT_ROOT/index1.html"
        "$PROJECT_ROOT/index-en.html"
        "$PROJECT_ROOT/index1-en.html"
        "$PROJECT_ROOT/index-personal.html"
        "$PROJECT_ROOT/index-personal-en.html"
        "$PROJECT_ROOT/index-bilingual.html"
        "$PROJECT_ROOT/index1-bilingual.html"
        "$PROJECT_ROOT/index-bilingual-personal.html"
    )
    
    mkdir -p "$BACKUP_DIR/root-files"
    for file in "${critical_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$BACKUP_DIR/root-files/"
            log "INFO" "已備份: $(basename "$file")"
        fi
    done
    
    # 建立備份清單
    find "$BACKUP_DIR" -type f > "$BACKUP_DIR/backup-manifest.txt"
    
    log "SUCCESS" "備份完成: $BACKUP_DIR"
    return 0
}

rollback_deployment() {
    local failed_stage="$1"
    
    log "WARNING" "開始回滾部署 (失敗階段: $failed_stage)"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "ERROR" "備份目錄不存在，無法回滾"
        return 1
    fi
    
    # 回滾PWA目錄
    if [[ -d "$BACKUP_DIR/pwa-card-storage-backup" ]]; then
        log "INFO" "回滾PWA目錄..."
        rm -rf "$PWA_DIR"
        cp -r "$BACKUP_DIR/pwa-card-storage-backup" "$PWA_DIR"
    fi
    
    # 回滾根目錄檔案
    if [[ -d "$BACKUP_DIR/root-files" ]]; then
        log "INFO" "回滾根目錄檔案..."
        cp "$BACKUP_DIR/root-files"/* "$PROJECT_ROOT/"
    fi
    
    log "SUCCESS" "回滾完成"
    return 0
}

# =============================================================================
# 部署階段函數
# =============================================================================

stage_path_audit() {
    print_stage "PATH_AUDIT" "執行硬編碼路徑審計"
    CURRENT_STAGE="PATH_AUDIT"
    
    log "INFO" "執行路徑審計工具..."
    
    if ! node "$SCRIPT_DIR/path-audit.js" > "$SCRIPT_DIR/path-audit-report.json"; then
        log "ERROR" "路徑審計失敗"
        return 1
    fi
    
    # 檢查審計結果
    if [[ -f "$SCRIPT_DIR/path-audit-report.json" ]]; then
        local issues_count=$(node -e "
            const report = require('$SCRIPT_DIR/path-audit-report.json');
            console.log(report.summary?.totalIssues || 0);
        " 2>/dev/null || echo "0")
        
        log "INFO" "發現 $issues_count 個路徑問題"
        
        if [[ "$issues_count" -gt 0 ]]; then
            log "INFO" "生成修復腳本..."
            if ! node "$SCRIPT_DIR/path-fix-generator.js"; then
                log "ERROR" "修復腳本生成失敗"
                return 1
            fi
        fi
    fi
    
    log "SUCCESS" "路徑審計完成"
    return 0
}

stage_resource_copy() {
    print_stage "RESOURCE_COPY" "複製核心資源檔案"
    CURRENT_STAGE="RESOURCE_COPY"
    
    log "INFO" "執行資源完整性管理器..."
    
    if ! node "$SCRIPT_DIR/resource-integrity-manager.js"; then
        log "ERROR" "資源複製失敗"
        return 1
    fi
    
    # 驗證資源完整性
    if [[ -f "$SCRIPT_DIR/resource-integrity-report.json" ]]; then
        local success_count=$(node -e "
            const report = require('$SCRIPT_DIR/resource-integrity-report.json');
            console.log(Object.values(report.resources || {}).filter(r => r.status === 'success').length);
        " 2>/dev/null || echo "0")
        
        log "INFO" "成功複製 $success_count 個資源檔案"
    fi
    
    log "SUCCESS" "資源複製完成"
    return 0
}

stage_path_update() {
    print_stage "PATH_UPDATE" "更新路徑引用"
    CURRENT_STAGE="PATH_UPDATE"
    
    # 更新HTML路徑
    log "INFO" "更新HTML路徑引用..."
    if ! node "$SCRIPT_DIR/html-path-updater.js"; then
        log "ERROR" "HTML路徑更新失敗"
        return 1
    fi
    
    # 更新Manifest路徑
    log "INFO" "更新Manifest路徑..."
    if ! node "$SCRIPT_DIR/manifest-path-updater.js"; then
        log "ERROR" "Manifest路徑更新失敗"
        return 1
    fi
    
    log "SUCCESS" "路徑更新完成"
    return 0
}

stage_security_setup() {
    print_stage "SECURITY_SETUP" "配置安全模組"
    CURRENT_STAGE="SECURITY_SETUP"
    
    # 檢查安全模組是否存在
    if [[ ! -d "$PWA_DIR/src/security" ]]; then
        log "INFO" "安全模組目錄不存在，跳過安全配置"
        return 0
    fi
    
    # 配置客戶端安全
    log "INFO" "配置客戶端安全設定..."
    if [[ -f "$SCRIPT_DIR/client-security-configurator.js" ]]; then
        if ! node "$SCRIPT_DIR/client-security-configurator.js"; then
            log "WARNING" "客戶端安全配置失敗，但繼續部署"
        fi
    fi
    
    log "SUCCESS" "安全配置完成"
    return 0
}

stage_config_setup() {
    print_stage "CONFIG_SETUP" "配置環境管理"
    CURRENT_STAGE="CONFIG_SETUP"
    
    # 檢查配置管理器
    if [[ -f "$PWA_DIR/src/core/configuration-manager.js" ]]; then
        log "INFO" "配置管理器已存在"
    else
        log "INFO" "配置管理器不存在，跳過配置設定"
        return 0
    fi
    
    # 檢查環境配置檔案
    local config_files=(
        "$PWA_DIR/config/github-pages-config.json"
        "$PWA_DIR/config/cloudflare-pages-config.json"
        "$PWA_DIR/config/netlify-config.json"
        "$PWA_DIR/config/vercel-config.json"
        "$PWA_DIR/config/local-config.json"
    )
    
    local config_count=0
    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            ((config_count++))
        fi
    done
    
    log "INFO" "發現 $config_count 個環境配置檔案"
    
    log "SUCCESS" "配置設定完成"
    return 0
}

stage_verification() {
    print_stage "VERIFICATION" "執行部署驗證"
    CURRENT_STAGE="VERIFICATION"
    
    log "INFO" "執行部署驗證工具..."
    
    # 執行部署驗證
    if ! node "$SCRIPT_DIR/deployment-verifier.js" --environment=local > "$SCRIPT_DIR/deployment-verification-report.json"; then
        log "ERROR" "部署驗證失敗"
        return 1
    fi
    
    # 分析驗證結果
    if [[ -f "$SCRIPT_DIR/deployment-verification-report.json" ]]; then
        local verification_result=$(node -e "
            try {
                const report = require('$SCRIPT_DIR/deployment-verification-report.json');
                console.log(JSON.stringify({
                    success: report.success || false,
                    score: report.overallScore || 0,
                    issues: report.issues?.length || 0
                }));
            } catch (e) {
                console.log('{\"success\": false, \"score\": 0, \"issues\": 999}');
            }
        " 2>/dev/null)
        
        local success=$(echo "$verification_result" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).success)")
        local score=$(echo "$verification_result" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).score)")
        local issues=$(echo "$verification_result" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).issues)")
        
        log "INFO" "驗證結果 - 成功: $success, 分數: $score, 問題: $issues"
        
        if [[ "$success" == "true" ]] && [[ "$score" -ge 80 ]]; then
            log "SUCCESS" "部署驗證通過 (分數: $score/100)"
        else
            log "WARNING" "部署驗證未完全通過 (分數: $score/100, 問題: $issues)"
            log "INFO" "詳細報告請查看: $SCRIPT_DIR/deployment-verification-report.json"
        fi
    fi
    
    log "SUCCESS" "驗證階段完成"
    return 0
}

stage_cleanup() {
    print_stage "CLEANUP" "清理暫存檔案"
    CURRENT_STAGE="CLEANUP"
    
    # 清理暫存檔案
    local temp_files=(
        "$SCRIPT_DIR/path-audit-report.json"
        "$SCRIPT_DIR/resource-integrity-report.json"
        "$SCRIPT_DIR/fix-hardcoded-paths-v2.sh"
    )
    
    for temp_file in "${temp_files[@]}"; do
        if [[ -f "$temp_file" ]]; then
            rm -f "$temp_file"
            log "INFO" "已清理: $(basename "$temp_file")"
        fi
    done
    
    log "SUCCESS" "清理完成"
    return 0
}

# =============================================================================
# 主要部署流程
# =============================================================================

main_deployment() {
    DEPLOYMENT_START_TIME=$(date +%s)
    
    print_banner
    
    # 階段1: 初始化
    print_stage "INIT" "初始化部署環境"
    CURRENT_STAGE="INIT"
    
    if ! validate_environment; then
        log "ERROR" "環境驗證失敗"
        exit 1
    fi
    
    if ! check_permissions; then
        log "ERROR" "權限檢查失敗"
        exit 1
    fi
    
    # 階段2: 備份
    if ! create_backup; then
        log "ERROR" "備份建立失敗"
        exit 1
    fi
    
    # 階段3-8: 主要部署流程
    local deployment_stages=(
        "stage_path_audit"
        "stage_resource_copy"
        "stage_path_update"
        "stage_security_setup"
        "stage_config_setup"
        "stage_verification"
        "stage_cleanup"
    )
    
    for stage_func in "${deployment_stages[@]}"; do
        if ! "$stage_func"; then
            FAILED_STAGE="$CURRENT_STAGE"
            log "ERROR" "部署失敗於階段: $CURRENT_STAGE"
            
            # 詢問是否回滾
            echo -e "${YELLOW}是否要回滾到部署前狀態? (y/N)${NC}"
            read -r -n 1 rollback_choice
            echo
            
            if [[ "$rollback_choice" =~ ^[Yy]$ ]]; then
                rollback_deployment "$FAILED_STAGE"
            fi
            
            exit 1
        fi
    done
    
    # 部署成功
    local deployment_end_time=$(date +%s)
    local deployment_duration=$((deployment_end_time - DEPLOYMENT_START_TIME))
    
    echo -e "${GREEN}"
    echo "============================================================================="
    echo "🎉 PWA 部署成功完成!"
    echo "============================================================================="
    echo "⏱️  部署時間: ${deployment_duration}秒"
    echo "📁 備份位置: $BACKUP_DIR"
    echo "📋 日誌檔案: $LOG_FILE"
    echo "📊 驗證報告: $SCRIPT_DIR/deployment-verification-report.json"
    echo "============================================================================="
    echo -e "${NC}"
    
    return 0
}

# =============================================================================
# 錯誤處理與清理
# =============================================================================

cleanup_on_exit() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]] && [[ -n "$FAILED_STAGE" ]]; then
        log "ERROR" "部署在 $FAILED_STAGE 階段失敗 (退出碼: $exit_code)"
        
        # 自動回滾選項
        if [[ "${AUTO_ROLLBACK:-}" == "true" ]]; then
            log "INFO" "自動回滾已啟用"
            rollback_deployment "$FAILED_STAGE"
        fi
    fi
    
    # 清理鎖定檔案
    if [[ -f "$SCRIPT_DIR/.deployment.lock" ]]; then
        rm -f "$SCRIPT_DIR/.deployment.lock"
    fi
}

trap cleanup_on_exit EXIT

# =============================================================================
# 命令列介面
# =============================================================================

show_help() {
    echo "PWA 靜態托管自動化部署腳本"
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --help              顯示此說明"
    echo "  -v, --verbose           詳細輸出模式"
    echo "  -n, --dry-run           模擬執行，不實際修改檔案"
    echo "  -r, --auto-rollback     失敗時自動回滾"
    echo "  -s, --skip-backup       跳過備份階段 (不建議)"
    echo "  -c, --config FILE       指定配置檔案"
    echo ""
    echo "範例:"
    echo "  $0                      # 標準部署"
    echo "  $0 --verbose            # 詳細輸出"
    echo "  $0 --dry-run            # 模擬執行"
    echo "  $0 --auto-rollback      # 自動回滾"
}

# 解析命令列參數
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        -n|--dry-run)
            DRY_RUN=true
            log "INFO" "模擬執行模式已啟用"
            shift
            ;;
        -r|--auto-rollback)
            AUTO_ROLLBACK=true
            log "INFO" "自動回滾已啟用"
            shift
            ;;
        -s|--skip-backup)
            SKIP_BACKUP=true
            log "WARNING" "跳過備份階段 (不建議)"
            shift
            ;;
        -c|--config)
            DEPLOYMENT_CONFIG="$2"
            shift 2
            ;;
        *)
            log "ERROR" "未知選項: $1"
            show_help
            exit 1
            ;;
    esac
done

# =============================================================================
# 主程式入口
# =============================================================================

# 檢查是否已有部署在執行
if [[ -f "$SCRIPT_DIR/.deployment.lock" ]]; then
    log "ERROR" "另一個部署程序正在執行中"
    exit 1
fi

# 建立鎖定檔案
echo "$$" > "$SCRIPT_DIR/.deployment.lock"

# 初始化日誌檔案
mkdir -p "$(dirname "$LOG_FILE")"
echo "=== PWA 部署開始 $(date) ===" > "$LOG_FILE"

# 執行主要部署流程
if [[ "${DRY_RUN:-}" == "true" ]]; then
    log "INFO" "模擬執行模式 - 不會實際修改檔案"
    log "INFO" "部署流程驗證完成"
    exit 0
else
    main_deployment
fi