/**
 * 验证帖子内容完整性的工具函数
 * 
 * 用于确保从MCP获取的帖子内容完整，避免存储不完整的内容
 */

export interface NoteValidationResult {
  isValid: boolean;
  issues: Array<{
    noteIndex: number;
    issue: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  }>;
  summary: {
    totalNotes: number;
    validNotes: number;
    incompleteNotes: number;
    shortNotes: number; // 内容很短但可能是完整的（如只有话题标签）
  };
}

/**
 * 验证单条笔记是否完整
 */
function validateSingleNote(noteText: string): {
  isValid: boolean;
  issues: Array<{ issue: string; severity: 'error' | 'warning'; suggestion?: string }>;
} {
  const issues: Array<{ issue: string; severity: 'error' | 'warning'; suggestion?: string }> = [];
  
  // 提取标题和内容
  const lines = noteText.trim().split('\n');
  const title = lines[0] || '';
  const content = lines.slice(1).join('\n').trim();
  
  // 检查1: 内容是否以截断标记结尾（严重错误）
  if (content.endsWith('...') || content.endsWith('…') || content.endsWith('...')) {
    issues.push({
      issue: '内容以"..."结尾，可能被截断',
      severity: 'error',
      suggestion: '需要重新从MCP获取完整内容'
    });
  }
  
  // 检查2: 内容是否以不完整句子结尾（可能是截断）
  const incompleteEndings = ['，', '、', '：', ':', '；', ';'];
  if (incompleteEndings.some(ending => content.endsWith(ending))) {
    // 但排除标题行本身可能以这些结尾
    if (content.length > 50) {
      issues.push({
        issue: '内容以标点符号结尾，可能不完整',
        severity: 'warning',
        suggestion: '检查是否被截断'
      });
    }
  }
  
  // 检查3: 内容长度异常短（可能是截断，也可能是真的短）
  if (content.length < 20 && !content.includes('#') && !content.includes('[')) {
    // 如果很短且不包含话题标签，可能是截断
    issues.push({
      issue: `内容过短（${content.length}字符），可能不完整`,
      severity: 'warning',
      suggestion: '确认是否真的只有这些内容'
    });
  }
  
  // 检查4: 内容包含明显的截断标记
  const truncationMarkers = ['...', '…', '（未完', '（待续', '（截断'];
  if (truncationMarkers.some(marker => content.includes(marker))) {
    issues.push({
      issue: '内容包含截断标记',
      severity: 'error',
      suggestion: '需要重新获取完整内容'
    });
  }
  
  // 检查5: 标题存在但内容为空
  if (title && !content) {
    issues.push({
      issue: '有标题但无内容',
      severity: 'error',
      suggestion: '需要重新获取内容'
    });
  }
  
  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues
  };
}

/**
 * 验证raw_notes_summary中所有笔记的完整性
 * 
 * @param rawNotesSummary 原始帖子汇总（用---分隔）
 * @returns 验证结果
 */
export function validateNotesCompleteness(rawNotesSummary: string): NoteValidationResult {
  if (!rawNotesSummary || !rawNotesSummary.trim()) {
    return {
      isValid: false,
      issues: [{
        noteIndex: 0,
        issue: 'raw_notes_summary为空',
        severity: 'error'
      }],
      summary: {
        totalNotes: 0,
        validNotes: 0,
        incompleteNotes: 0,
        shortNotes: 0
      }
    };
  }
  
  const notes = rawNotesSummary.split('---').map(n => n.trim()).filter(Boolean);
  const allIssues: Array<{
    noteIndex: number;
    issue: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  }> = [];
  
  let validNotes = 0;
  let incompleteNotes = 0;
  let shortNotes = 0;
  
  notes.forEach((noteText, index) => {
    const validation = validateSingleNote(noteText);
    
    if (validation.isValid) {
      validNotes++;
      
      // 检查是否是短笔记（但完整）
      const lines = noteText.trim().split('\n');
      const content = lines.slice(1).join('\n').trim();
      if (content.length < 50) {
        shortNotes++;
      }
    } else {
      incompleteNotes++;
    }
    
    // 收集所有问题
    validation.issues.forEach(issue => {
      allIssues.push({
        noteIndex: index + 1,
        ...issue
      });
    });
  });
  
  const hasErrors = allIssues.some(i => i.severity === 'error');
  
  return {
    isValid: !hasErrors,
    issues: allIssues,
    summary: {
      totalNotes: notes.length,
      validNotes,
      incompleteNotes,
      shortNotes
    }
  };
}

/**
 * 格式化验证结果为可读的字符串
 */
export function formatValidationResult(result: NoteValidationResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('📋 笔记完整性验证结果');
  lines.push('='.repeat(80));
  lines.push(`总笔记数: ${result.summary.totalNotes}`);
  lines.push(`✅ 完整笔记: ${result.summary.validNotes}`);
  lines.push(`⚠️  不完整笔记: ${result.summary.incompleteNotes}`);
  lines.push(`📝 短笔记（可能完整）: ${result.summary.shortNotes}`);
  lines.push('');
  
  if (result.issues.length > 0) {
    lines.push('发现的问题:');
    lines.push('');
    
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    
    if (errors.length > 0) {
      lines.push('❌ 严重问题（必须修复）:');
      errors.forEach(issue => {
        lines.push(`   笔记${issue.noteIndex}: ${issue.issue}`);
        if (issue.suggestion) {
          lines.push(`      建议: ${issue.suggestion}`);
        }
      });
      lines.push('');
    }
    
    if (warnings.length > 0) {
      lines.push('⚠️  警告（建议检查）:');
      warnings.forEach(issue => {
        lines.push(`   笔记${issue.noteIndex}: ${issue.issue}`);
        if (issue.suggestion) {
          lines.push(`      建议: ${issue.suggestion}`);
        }
      });
      lines.push('');
    }
  } else {
    lines.push('✅ 所有笔记验证通过！');
    lines.push('');
  }
  
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * 检查并修复不完整的笔记（需要重新从MCP获取）
 * 
 * 返回需要重新获取的笔记索引列表
 */
export function getNotesToRefetch(
  rawNotesSummary: string,
  noteIds: string[]
): Array<{ index: number; noteId: string; reason: string }> {
  const result = validateNotesCompleteness(rawNotesSummary);
  const notesToRefetch: Array<{ index: number; noteId: string; reason: string }> = [];
  
  result.issues
    .filter(issue => issue.severity === 'error')
    .forEach(issue => {
      const noteIndex = issue.noteIndex - 1; // 转换为0-based索引
      if (noteIndex < noteIds.length) {
        notesToRefetch.push({
          index: issue.noteIndex,
          noteId: noteIds[noteIndex],
          reason: issue.issue
        });
      }
    });
  
  return notesToRefetch;
}

