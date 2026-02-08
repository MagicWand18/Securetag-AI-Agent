import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportData, FileNode } from '../ReportService';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  // Cover Page Styles
  coverPage: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#111827', // Dark background for cover
    color: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 20,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  coverSubtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 60,
    textAlign: 'center',
  },
  coverMeta: {
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 10,
    textAlign: 'center',
  },
  
  // General Styles
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  
  // Coverage Styles
  coverageContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  coverageItem: {
    alignItems: 'center',
  },
  coverageValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  coverageLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  
  // Chart Styles
  chartContainer: {
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 15,
    color: '#111827',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-around',
    paddingBottom: 5,
  },
  barGroup: {
    alignItems: 'center',
    width: 40,
  },
  bar: {
    width: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 8,
    marginTop: 5,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Finding Styles
  findingCard: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  findingHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
    fontSize: 10,
    fontWeight: 700,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  findingTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 15,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationText: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#6B7280',
    marginBottom: 10,
  },
  codeBlock: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: '#374151',
  },
  analysisSection: {
    marginBottom: 10,
    marginTop: 5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#4B5563',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  analysisText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9CA3AF',
  },
});

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical': return '#EF4444';
    case 'high': return '#F97316';
    case 'medium': return '#F59E0B';
    case 'low': return '#3B82F6';
    default: return '#6B7280';
  }
};

const ScanCoverage = ({ files, rules }: { files: number, rules: number }) => {
  return React.createElement(View, { style: styles.coverageContainer },
    React.createElement(View, { style: styles.coverageItem },
      React.createElement(Text, { style: styles.coverageValue }, files.toString()),
      React.createElement(Text, { style: styles.coverageLabel }, 'Files Scanned')
    ),
    React.createElement(View, { style: styles.coverageItem },
      React.createElement(Text, { style: styles.coverageValue }, rules.toString()),
      React.createElement(Text, { style: styles.coverageLabel }, 'Rules Executed')
    )
  );
};

const SourceTree = ({ nodes }: { nodes: FileNode[] }) => {
  const renderNode = (node: FileNode, depth: number) => {
    return React.createElement(View, { key: node.name + depth, style: { marginLeft: depth * 10, flexDirection: 'row', marginBottom: 6, paddingVertical: 1 } },
       React.createElement(Text, { style: { fontSize: 8, color: '#374151', fontWeight: node.type === 'directory' ? 700 : 400 } },
         `${node.type === 'directory' ? '[DIR] ' : ''}${node.name} (${node.findingsCount})`
       )
    );
  };

  const renderTree = (nodes: FileNode[], depth: number = 0): any[] => {
    if (depth > 2) return []; 
    let views: any[] = [];
    let count = 0;
    
    // Sort by findings count desc
    const sorted = [...nodes].sort((a, b) => b.findingsCount - a.findingsCount);
    
    for (const node of sorted) {
      if (count > 5) { 
        views.push(
          React.createElement(Text, { key: `more-${depth}`, style: { marginLeft: depth * 10, fontSize: 8, color: '#9CA3AF', marginTop: 4 } }, '... (+ more)')
        );
        break;
      }
      views.push(renderNode(node, depth));
      if (node.children) {
        views = [...views, ...renderTree(node.children, depth + 1)];
      }
      count++;
    }
    return views;
  };

  return React.createElement(View, { style: { marginTop: 10, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 4 } },
    React.createElement(Text, { style: { fontSize: 10, fontWeight: 700, marginBottom: 5, color: '#4B5563' } }, 'Top Affected Paths'),
    ...renderTree(nodes)
  );
};

const SeverityChart = ({ data }: { data: ReportData['metrics']['severityCounts'] }) => {
  const max = Math.max(
    data.critical, 
    data.high, 
    data.medium, 
    data.low, 
    data.info, 
    1 // Avoid division by zero
  );

  const getHeight = (val: number) => `${(val / max) * 100}%`;

  const items = [
    { label: 'Critical', value: data.critical, color: '#EF4444' },
    { label: 'High', value: data.high, color: '#F97316' },
    { label: 'Medium', value: data.medium, color: '#F59E0B' },
    { label: 'Low', value: data.low, color: '#3B82F6' },
    { label: 'Info', value: data.info, color: '#6B7280' },
  ];

  return React.createElement(View, { style: styles.chartContainer },
    React.createElement(Text, { style: styles.chartTitle }, 'Severity Distribution'),
    React.createElement(View, { style: styles.barContainer },
      items.map((item) => 
        React.createElement(View, { key: item.label, style: styles.barGroup },
          React.createElement(Text, { style: { fontSize: 8, marginBottom: 2, color: item.color } }, item.value.toString()),
          React.createElement(View, { 
            style: { 
              ...styles.bar, 
              backgroundColor: item.color, 
              height: getHeight(item.value) 
            } 
          }),
          React.createElement(Text, { style: styles.barLabel }, item.label)
        )
      )
    )
  );
};

const RenderCodeSnippet = ({ code, targetLine }: { code: string, targetLine: number }) => {
  if (!code) return null;
  const lines = code.split('\n');
  // Backend provides 5 lines of context before the vulnerability
  const startLine = Math.max(1, targetLine - 5);

  return React.createElement(View, { style: { ...styles.codeBlock, padding: 5 } },
    lines.map((line, i) => {
      const currentLineNumber = startLine + i;
      const isTarget = currentLineNumber === targetLine;
      
      return React.createElement(View, { 
        key: i, 
        style: { 
          flexDirection: 'row', 
          backgroundColor: isTarget ? '#FECACA' : 'transparent', // Red-200
          paddingVertical: 2,
          paddingHorizontal: 4,
          borderRadius: 2
        } 
      },
        React.createElement(Text, { 
          style: { 
            ...styles.codeText, 
            width: 25, 
            color: '#6B7280', 
            textAlign: 'right', 
            marginRight: 8,
            borderRightWidth: 1,
            borderRightColor: '#D1D5DB',
            paddingRight: 4
          } 
        }, currentLineNumber.toString()),
        React.createElement(Text, { 
          style: { 
            ...styles.codeText, 
            flex: 1, 
            color: isTarget ? '#7F1D1D' : '#374151', // Red-900
            fontWeight: isTarget ? 700 : 400 
          } 
        }, line)
      );
    })
  );
};

export const TechnicalReport = ({ data }: { data: ReportData }) => {
  try {
    return React.createElement(Document, {},
      // 1. Cover Page
      React.createElement(Page, { size: 'A4', style: styles.coverPage },
        React.createElement(Text, { style: styles.coverTitle }, 'Technical Remediation Report'),
        React.createElement(Text, { style: styles.coverSubtitle }, data.project.name),
        
        React.createElement(View, { style: { marginTop: 40 } },
          React.createElement(Text, { style: styles.coverMeta }, `Date: ${data.meta.generatedAt.toLocaleDateString()}`),
          React.createElement(Text, { style: styles.coverMeta }, `Scan ID: ${data.meta.scanId.slice(0, 8)}`),
          React.createElement(Text, { style: styles.coverMeta }, `Prepared for: ${data.client.name}`),
          React.createElement(Text, { style: styles.coverMeta }, data.client.organization || '')
        )
      ),

      // 2. Content Pages
      React.createElement(Page, { size: 'A4', style: styles.page },
        // Header
        React.createElement(View, { style: styles.header, fixed: true },
          React.createElement(Text, { style: styles.headerTitle }, 'Confidential Security Assessment'),
          React.createElement(Text, { style: styles.headerTitle }, `${data.project.name} | ${data.meta.generatedAt.toLocaleDateString()}`)
        ),

        // Summary Section (First content page only)
        React.createElement(View, { style: { marginBottom: 30 } },
          React.createElement(Text, { style: { fontSize: 18, fontWeight: 700, marginBottom: 10 } }, 'Executive Summary'),
          React.createElement(Text, { style: { fontSize: 10, color: '#4B5563', marginBottom: 20 } },
            `This report details the technical findings from the automated security scan. A total of ${data.metrics.totalFindings} issues were identified.`
          ),
          
          // Coverage Metrics
          React.createElement(ScanCoverage, { 
            files: data.metrics.filesScanned || 0, 
            rules: data.metrics.rulesExecuted || 0 
          }),

          // Chart
          React.createElement(SeverityChart, { data: data.metrics.severityCounts }),
          
          // Source Tree
          data.sourceTree && data.sourceTree.length > 0 ? 
            React.createElement(SourceTree, { nodes: data.sourceTree }) : null
        ),

        // Findings Loop
        data.findings.map((finding, index) => {
          return React.createElement(View, { key: index, style: styles.findingCard, wrap: false },
            
            // Header: Severity + Rule Name
            React.createElement(View, { style: styles.findingHeader },
              React.createElement(Text, { style: { ...styles.severityBadge, backgroundColor: getSeverityColor(finding.severity) } },
                finding.severity
              ),
              React.createElement(Text, { style: styles.findingTitle }, finding.ruleName)
            ),

            // Meta Row: CWE, CVE
            (finding.cwe || finding.cve) ? React.createElement(View, { style: styles.metaRow },
              finding.cwe ? React.createElement(Text, { style: styles.metaItem }, finding.cwe) : null,
              finding.cve ? React.createElement(Text, { style: styles.metaItem }, finding.cve) : null
            ) : null,

            // Location
            React.createElement(Text, { style: styles.locationText },
              `${finding.filePath}:${finding.line}`
            ),

            // Code Snippet
            finding.codeSnippet ? React.createElement(RenderCodeSnippet, { 
              code: finding.codeSnippet, 
              targetLine: finding.line 
            }) : null,

            // Analysis
            React.createElement(View, { style: styles.analysisSection },
              React.createElement(Text, { style: styles.sectionLabel }, 'Analysis'),
              React.createElement(Text, { style: styles.analysisText },
                finding.analysis.reasoning || 'No detailed analysis provided.'
              )
            ),

            // Remediation
            finding.analysis.recommendation ? React.createElement(View, { style: styles.analysisSection },
              React.createElement(Text, { style: styles.sectionLabel }, 'Remediation'),
              React.createElement(Text, { style: styles.analysisText },
                finding.analysis.recommendation
              )
            ) : null
          );
        }),

        // Footer
        React.createElement(View, { style: styles.footer, fixed: true },
          React.createElement(Text, { style: styles.pageNumber }, 'SecureTag Automated Report'),
          React.createElement(Text, {
            style: styles.pageNumber,
            render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`
          })
        )
      )
    );
  } catch (err) {
    console.error('Error inside TechnicalReport component:', err);
    return React.createElement(Document, {}, 
      React.createElement(Page, {}, 
        React.createElement(Text, {}, "Error generating report")
      )
    );
  }
};
