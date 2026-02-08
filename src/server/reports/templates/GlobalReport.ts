import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { GlobalReportData } from '../ReportService';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  coverPage: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 20,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  coverSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 60,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 15,
    marginTop: 20,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 8,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  colName: { flex: 3 },
  colSeverity: { flex: 1 },
  colCount: { flex: 1, textAlign: 'right' },
  headerText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#4B5563',
  },
  cellText: {
    fontSize: 10,
    color: '#374151',
  },
  trendContainer: {
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10,
  },
  trendBar: {
    width: 20,
    backgroundColor: '#3B82F6',
    marginHorizontal: 2,
  },
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

export const GlobalReport = ({ data }: { data: GlobalReportData }) => {
  const maxFindings = Math.max(...data.trends.map(t => t.critical + t.high + t.medium + t.low), 1);
  
  return React.createElement(Document, {},
    // Cover Page
    React.createElement(Page, { size: 'A4', style: styles.coverPage },
      React.createElement(Text, { style: styles.coverTitle }, 'Project Security Status Report'),
      React.createElement(Text, { style: styles.coverSubtitle }, data.project.name),
      React.createElement(Text, { style: { color: '#D1D5DB', fontSize: 12 } }, 
        `${data.period.start.toLocaleDateString()} - ${data.period.end.toLocaleDateString()}`
      )
    ),

    // Content Page
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Metrics Header
      React.createElement(View, { style: styles.metricsContainer },
        React.createElement(View, { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricValue }, data.metrics.currentRiskScore.toString()),
          React.createElement(Text, { style: styles.metricLabel }, 'Risk Score')
        ),
        React.createElement(View, { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricValue }, data.metrics.openFindings.toString()),
          React.createElement(Text, { style: styles.metricLabel }, 'Open Findings')
        ),
        React.createElement(View, { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricValue }, data.metrics.fixedFindings.toString()),
          React.createElement(Text, { style: styles.metricLabel }, 'Fixed Findings')
        ),
        React.createElement(View, { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricValue }, data.metrics.totalScans.toString()),
          React.createElement(Text, { style: styles.metricLabel }, 'Total Scans')
        )
      ),

      // Trend Chart (Simplified)
      React.createElement(Text, { style: styles.sectionTitle }, 'Vulnerability Trend (Last Scans)'),
      React.createElement(View, { style: styles.trendContainer },
        data.trends.slice(-10).map((t, i) => {
          const total = t.critical + t.high + t.medium + t.low;
          const height = (total / maxFindings) * 100;
          return React.createElement(View, { key: i, style: { alignItems: 'center' } },
             React.createElement(View, { style: { ...styles.trendBar, height: `${height}%` } }),
             React.createElement(Text, { style: { fontSize: 8, marginTop: 4, color: '#6B7280' } }, t.date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }))
          );
        })
      ),

      // Top Vulnerabilities Table
      React.createElement(Text, { style: styles.sectionTitle }, 'Top 10 Recurring Vulnerabilities'),
      React.createElement(View, { style: styles.table },
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(View, { style: styles.colName }, React.createElement(Text, { style: styles.headerText }, 'Rule Name')),
          React.createElement(View, { style: styles.colSeverity }, React.createElement(Text, { style: styles.headerText }, 'Severity')),
          React.createElement(View, { style: styles.colCount }, React.createElement(Text, { style: styles.headerText }, 'Count'))
        ),
        data.topVulnerabilities.map((v, i) => 
          React.createElement(View, { key: i, style: styles.tableRow },
            React.createElement(View, { style: styles.colName }, React.createElement(Text, { style: styles.cellText }, v.ruleName)),
            React.createElement(View, { style: styles.colSeverity }, 
              React.createElement(Text, { style: { ...styles.cellText, color: getSeverityColor(v.severity), fontWeight: 700 } }, v.severity)
            ),
            React.createElement(View, { style: styles.colCount }, React.createElement(Text, { style: styles.cellText }, v.count.toString()))
          )
        )
      ),

      // Footer
      React.createElement(View, { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.pageNumber }, 'SecureTag Global Report'),
        React.createElement(Text, {
          style: styles.pageNumber,
          render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`
        })
      )
    )
  );
};
