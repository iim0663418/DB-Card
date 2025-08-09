/**
 * Custom ESLint Rules for LOG-001 Security Requirements
 * Prevents CWE-117 log injection vulnerabilities
 */

module.exports = {
  rules: {
    // Rule to prevent console.log with user input (template literals with variables)
    'no-unsafe-console-log': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent console.log with user input to avoid CWE-117 log injection',
          category: 'Security',
          recommended: true
        },
        fixable: 'code',
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            // Check for console.log, console.warn, console.error, console.debug
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'console' &&
              ['log', 'warn', 'error', 'debug'].includes(node.callee.property.name)
            ) {
              // Check if any argument contains template literals with expressions
              const hasUnsafeTemplateString = node.arguments.some(arg => {
                return arg.type === 'TemplateLiteral' && arg.expressions.length > 0;
              });
              
              // Check if any argument contains string concatenation with variables
              const hasStringConcatenation = node.arguments.some(arg => {
                return arg.type === 'BinaryExpression' && arg.operator === '+';
              });
              
              if (hasUnsafeTemplateString || hasStringConcatenation) {
                context.report({
                  node,
                  message: `Unsafe ${node.callee.property.name} detected. Use SecureLogger instead to prevent CWE-117 log injection vulnerabilities.`,
                  fix(fixer) {
                    // Suggest using SecureLogger
                    const methodName = node.callee.property.name;
                    const loggerMethod = methodName === 'log' ? 'info' : methodName;
                    
                    return fixer.replaceText(
                      node,
                      `this.secureLogger.${loggerMethod}('Log message', { /* structured data */ })`
                    );
                  }
                });
              }
            }
          }
        };
      }
    },
    
    // Rule to enforce SecureLogger usage in PWA modules
    'require-secure-logger': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Require SecureLogger import in PWA modules',
          category: 'Security',
          recommended: true
        },
        schema: []
      },
      create(context) {
        let hasSecureLoggerImport = false;
        let hasConsoleUsage = false;
        
        return {
          ImportDeclaration(node) {
            if (
              node.source.value.includes('secure-logger') &&
              node.specifiers.some(spec => spec.imported && spec.imported.name === 'SecureLogger')
            ) {
              hasSecureLoggerImport = true;
            }
          },
          
          CallExpression(node) {
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'console'
            ) {
              hasConsoleUsage = true;
            }
          },
          
          'Program:exit'() {
            const filename = context.getFilename();
            
            // Only check PWA source files
            if (filename.includes('pwa-card-storage/src/') && hasConsoleUsage && !hasSecureLoggerImport) {
              context.report({
                node: context.getSourceCode().ast,
                message: 'PWA modules with console usage must import SecureLogger for security compliance.'
              });
            }
          }
        };
      }
    },
    
    // Rule to prevent direct string interpolation in logging
    'no-log-interpolation': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent direct string interpolation in logging functions',
          category: 'Security',
          recommended: true
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            // Check for any logging function calls
            const isLoggingCall = (
              (node.callee.type === 'MemberExpression' && 
               node.callee.object.name === 'console') ||
              (node.callee.type === 'MemberExpression' &&
               node.callee.object.name === 'logger') ||
              (node.callee.name && node.callee.name.toLowerCase().includes('log'))
            );
            
            if (isLoggingCall) {
              node.arguments.forEach(arg => {
                // Check for template literals with expressions
                if (arg.type === 'TemplateLiteral' && arg.expressions.length > 0) {
                  // Check if expressions contain identifiers (variables)
                  const hasVariableInterpolation = arg.expressions.some(expr => 
                    expr.type === 'Identifier' || 
                    expr.type === 'MemberExpression' ||
                    expr.type === 'CallExpression'
                  );
                  
                  if (hasVariableInterpolation) {
                    context.report({
                      node: arg,
                      message: 'Avoid direct variable interpolation in log messages. Use structured logging instead.'
                    });
                  }
                }
              });
            }
          }
        };
      }
    }
  }
};