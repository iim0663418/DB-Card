/**
 * VERSION-02: 版本管理器工具函數
 * 支援版本分析、趨勢預測和效能優化
 */

class VersionManagerUtils {
  /**
   * 分析欄位變更
   */
  static analyzeFieldChange(fieldName, oldValue, newValue) {
    const analysis = {
      type: 'unknown',
      severity: 'low',
      description: ''
    };

    // 特殊欄位分析
    switch (fieldName) {
      case 'name':
        analysis.type = 'identity';
        analysis.severity = 'high';
        analysis.description = '姓名變更可能影響身份識別';
        break;
      case 'email':
        analysis.type = 'contact';
        analysis.severity = 'high';
        analysis.description = '電子郵件變更影響聯絡方式';
        break;
      case 'phone':
      case 'mobile':
        analysis.type = 'contact';
        analysis.severity = 'medium';
        analysis.description = '電話號碼變更影響聯絡方式';
        break;
      case 'title':
        analysis.type = 'professional';
        analysis.severity = 'medium';
        analysis.description = '職稱變更可能反映職業發展';
        break;
      case 'department':
      case 'organization':
        analysis.type = 'organizational';
        analysis.severity = 'medium';
        analysis.description = '組織資訊變更';
        break;
      case 'address':
        analysis.type = 'location';
        analysis.severity = 'low';
        analysis.description = '地址資訊變更';
        break;
      case 'avatar':
        analysis.type = 'visual';
        analysis.severity = 'low';
        analysis.description = '頭像變更';
        break;
      default:
        analysis.type = 'general';
        analysis.severity = 'low';
        analysis.description = '一般資訊變更';
    }

    // 分析變更模式
    if (!oldValue && newValue) {
      analysis.pattern = 'addition';
    } else if (oldValue && !newValue) {
      analysis.pattern = 'removal';
    } else {
      analysis.pattern = 'modification';
    }

    return analysis;
  }

  /**
   * 獲取欄位重要性
   */
  static getFieldImportance(fieldName) {
    const importanceMap = {
      name: 10,
      email: 9,
      phone: 8,
      mobile: 8,
      title: 7,
      department: 6,
      organization: 6,
      address: 5,
      avatar: 4,
      socialNote: 3,
      greetings: 2
    };

    return importanceMap[fieldName] || 1;
  }

  /**
   * 獲取欄位顯示名稱
   */
  static getFieldDisplayName(fieldName) {
    const displayNames = {
      name: '姓名',
      email: '電子郵件',
      phone: '電話',
      mobile: '手機',
      title: '職稱',
      department: '部門',
      organization: '組織',
      address: '地址',
      avatar: '頭像',
      socialNote: '社群連結',
      greetings: '問候語'
    };

    return displayNames[fieldName] || fieldName;
  }

  /**
   * 獲取相似度等級
   */
  static getSimilarityLevel(score) {
    if (score >= 0.9) return 'very_high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    if (score >= 0.3) return 'low';
    return 'very_low';
  }

  /**
   * 格式化持續時間
   */
  static formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天${hours % 24}小時`;
    } else if (hours > 0) {
      return `${hours}小時${minutes % 60}分鐘`;
    } else if (minutes > 0) {
      return `${minutes}分鐘`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 計算平均每月變更次數
   */
  static calculateAverageChangesPerMonth(monthlyActivity) {
    const months = Object.keys(monthlyActivity);
    if (months.length === 0) return 0;

    const totalChanges = Object.values(monthlyActivity).reduce((sum, count) => sum + count, 0);
    return Math.round((totalChanges / months.length) * 100) / 100;
  }

  /**
   * 獲取最活躍月份
   */
  static getMostActiveMonth(monthlyActivity) {
    let maxMonth = null;
    let maxCount = 0;

    for (const [month, count] of Object.entries(monthlyActivity)) {
      if (count > maxCount) {
        maxCount = count;
        maxMonth = month;
      }
    }

    return maxMonth ? { month: maxMonth, count: maxCount } : null;
  }

  /**
   * 獲取頻率等級
   */
  static getFrequencyLevel(averageInterval) {
    const days = averageInterval / (1000 * 60 * 60 * 24);

    if (days < 1) return 'very_high';
    if (days < 7) return 'high';
    if (days < 30) return 'medium';
    if (days < 90) return 'low';
    return 'very_low';
  }

  /**
   * 獲取活動趨勢
   */
  static getActivityTrend(recentVersions) {
    if (recentVersions.length < 2) return 'stable';

    const intervals = [];
    for (let i = 0; i < recentVersions.length - 1; i++) {
      const interval = recentVersions[i].timestamp - recentVersions[i + 1].timestamp;
      intervals.push(interval);
    }

    // 計算趨勢
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));

    const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;

    if (firstAvg > secondAvg * 1.2) {
      return 'increasing'; // 變更頻率增加
    } else if (secondAvg > firstAvg * 1.2) {
      return 'decreasing'; // 變更頻率減少
    } else {
      return 'stable'; // 穩定
    }
  }

  /**
   * 獲取主要變更類型
   */
  static getDominantChangeType(changeTypes) {
    const counts = {};
    changeTypes.forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });

    let dominantType = null;
    let maxCount = 0;

    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    return dominantType;
  }

  /**
   * 計算穩定性分數
   */
  static calculateStabilityScore(versions) {
    if (versions.length < 2) return 1.0;

    // 基於變更頻率和變更類型計算穩定性
    const intervals = [];
    for (let i = 0; i < versions.length - 1; i++) {
      intervals.push(versions[i].timestamp - versions[i + 1].timestamp);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stability = Math.max(0, 1 - (variance / Math.pow(avgInterval, 2)));

    return Math.round(stability * 100) / 100;
  }

  /**
   * 預測下次變更
   */
  static predictNextChange(versions) {
    if (versions.length < 3) {
      return {
        confidence: 'low',
        estimatedTime: null,
        reasoning: '資料不足，無法預測'
      };
    }

    const recentVersions = versions.slice(0, 5);
    const intervals = [];
    
    for (let i = 0; i < recentVersions.length - 1; i++) {
      intervals.push(recentVersions[i].timestamp - recentVersions[i + 1].timestamp);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const lastChangeTime = recentVersions[0].timestamp;
    const estimatedNextChange = new Date(lastChangeTime.getTime() + avgInterval);

    // 計算信心度
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const coefficient = Math.sqrt(variance) / avgInterval;
    
    let confidence;
    if (coefficient < 0.3) {
      confidence = 'high';
    } else if (coefficient < 0.6) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      confidence,
      estimatedTime: estimatedNextChange,
      reasoning: `基於最近${intervals.length}次變更的平均間隔預測`,
      avgInterval: this.formatDuration(avgInterval)
    };
  }

  /**
   * 分析全域趨勢
   */
  static analyzeGlobalTrends(allVersions) {
    if (!allVersions || allVersions.length === 0) {
      return null;
    }

    // 按月份分組
    const monthlyStats = {};
    allVersions.forEach(version => {
      const monthKey = version.timestamp.toISOString().substring(0, 7);
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          count: 0,
          changeTypes: {}
        };
      }
      monthlyStats[monthKey].count++;
      
      const changeType = version.changeType || 'unknown';
      monthlyStats[monthKey].changeTypes[changeType] = 
        (monthlyStats[monthKey].changeTypes[changeType] || 0) + 1;
    });

    const months = Object.keys(monthlyStats).sort();
    const recentMonths = months.slice(-6); // 最近6個月

    return {
      totalMonths: months.length,
      recentActivity: recentMonths.map(month => ({
        month,
        count: monthlyStats[month].count,
        changeTypes: monthlyStats[month].changeTypes
      })),
      trend: this.calculateGlobalTrend(recentMonths.map(m => monthlyStats[m].count)),
      peakMonth: this.findPeakMonth(monthlyStats)
    };
  }

  /**
   * 獲取最活躍名片
   */
  static getTopActiveCards(cards, allVersions) {
    const cardVersionCounts = {};
    
    allVersions.forEach(version => {
      cardVersionCounts[version.cardId] = (cardVersionCounts[version.cardId] || 0) + 1;
    });

    const sortedCards = Object.entries(cardVersionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cardId, versionCount]) => {
        const card = cards.find(c => c.id === cardId);
        return {
          cardId,
          cardName: card?.data?.name || 'Unknown',
          versionCount,
          lastModified: card?.modified
        };
      });

    return sortedCards;
  }

  /**
   * 計算儲存效率
   */
  static calculateStorageEfficiency(allVersions) {
    if (!allVersions || allVersions.length === 0) {
      return { score: 1.0, level: 'excellent' };
    }

    const totalSize = allVersions.reduce((sum, version) => {
      return sum + JSON.stringify(version).length;
    }, 0);

    const avgSizePerVersion = totalSize / allVersions.length;
    
    // 基於平均大小判斷效率
    let score, level;
    if (avgSizePerVersion < 1000) {
      score = 1.0;
      level = 'excellent';
    } else if (avgSizePerVersion < 2000) {
      score = 0.8;
      level = 'good';
    } else if (avgSizePerVersion < 5000) {
      score = 0.6;
      level = 'fair';
    } else {
      score = 0.4;
      level = 'poor';
    }

    return {
      score,
      level,
      totalSize,
      avgSizePerVersion,
      totalVersions: allVersions.length
    };
  }

  /**
   * 生成清理建議
   */
  static generateCleanupRecommendations(allVersions) {
    const recommendations = [];
    
    if (!allVersions || allVersions.length === 0) {
      return recommendations;
    }

    // 檢查舊版本
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldVersions = allVersions.filter(v => v.timestamp < oneMonthAgo);
    
    if (oldVersions.length > 100) {
      recommendations.push({
        type: 'cleanup_old',
        priority: 'medium',
        description: `建議清理 ${oldVersions.length} 個超過一個月的舊版本`,
        action: 'cleanupOldVersions',
        params: { olderThan: oneMonthAgo }
      });
    }

    // 檢查重複版本
    const duplicateVersions = this.findDuplicateVersions(allVersions);
    if (duplicateVersions.length > 0) {
      recommendations.push({
        type: 'remove_duplicates',
        priority: 'low',
        description: `發現 ${duplicateVersions.length} 個可能的重複版本`,
        action: 'removeDuplicateVersions',
        params: { duplicates: duplicateVersions }
      });
    }

    return recommendations;
  }

  /**
   * 計算全域趨勢
   */
  static calculateGlobalTrend(monthlyCounts) {
    if (monthlyCounts.length < 2) return 'stable';

    const firstHalf = monthlyCounts.slice(0, Math.floor(monthlyCounts.length / 2));
    const secondHalf = monthlyCounts.slice(Math.floor(monthlyCounts.length / 2));

    const firstAvg = firstHalf.reduce((sum, count) => sum + count, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, count) => sum + count, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.2) {
      return 'increasing';
    } else if (firstAvg > secondAvg * 1.2) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * 找出峰值月份
   */
  static findPeakMonth(monthlyStats) {
    let peakMonth = null;
    let maxCount = 0;

    for (const [month, stats] of Object.entries(monthlyStats)) {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        peakMonth = month;
      }
    }

    return peakMonth ? { month: peakMonth, count: maxCount } : null;
  }

  /**
   * 找出重複版本
   */
  static findDuplicateVersions(allVersions) {
    const checksumMap = {};
    const duplicates = [];

    allVersions.forEach(version => {
      if (version.checksum) {
        if (checksumMap[version.checksum]) {
          duplicates.push({
            original: checksumMap[version.checksum],
            duplicate: version
          });
        } else {
          checksumMap[version.checksum] = version;
        }
      }
    });

    return duplicates;
  }
}

// 擴展 VersionManager 類別
if (typeof window !== 'undefined' && window.VersionManager) {
  // 將工具函數添加到 VersionManager 原型
  Object.getOwnPropertyNames(VersionManagerUtils)
    .filter(name => typeof VersionManagerUtils[name] === 'function' && name !== 'constructor')
    .forEach(name => {
      window.VersionManager.prototype[name] = function(...args) {
        return VersionManagerUtils[name].apply(this, args);
      };
    });
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VersionManagerUtils;
} else if (typeof window !== 'undefined') {
  window.VersionManagerUtils = VersionManagerUtils;
}