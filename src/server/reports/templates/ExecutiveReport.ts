import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { ReportData } from '../ReportService';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Roboto',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 20,
  },
  brand: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
  },
  brandSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  meta: {
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  titleSection: {
    marginBottom: 40,
  },
  reportTitle: {
    fontSize: 28,
    fontWeight: 300,
    color: '#111827',
    marginBottom: 10,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 500,
    color: '#3B82F6',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statBox: {
    width: '30%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
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
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
});

export const ExecutiveReport = ({ data }: { data: ReportData }) => {
  return React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, {},
          React.createElement(Text, { style: styles.brand }, 'AEGIS'),
          React.createElement(Text, { style: styles.brandSub }, 'Defense Platform')
        ),
        React.createElement(View, { style: styles.meta },
          React.createElement(Text, { style: styles.metaText }, 'CONFIDENTIAL'),
          React.createElement(Text, { style: styles.metaText }, data.meta.generatedAt.toLocaleDateString()),
          React.createElement(Text, { style: styles.metaText }, `Scan ID: ${data.meta.scanId.slice(0, 8)}`)
        )
      ),

      // Title
      React.createElement(View, { style: styles.titleSection },
        React.createElement(Text, { style: styles.reportTitle }, 'Executive Security Summary'),
        React.createElement(Text, { style: styles.projectName }, data.project.name),
        React.createElement(Text, { style: { fontSize: 12, marginTop: 10, color: '#4B5563' } },
          `Prepared for: ${data.client.name} ${data.client.organization ? `(${data.client.organization})` : ''}`
        )
      ),

      // Stats
      React.createElement(View, { style: styles.statsRow },
        React.createElement(View, { style: styles.statBox },
          React.createElement(Text, { style: styles.statLabel }, 'Total Findings'),
          React.createElement(Text, { style: styles.statValue }, String(data.metrics.totalFindings))
        ),
        React.createElement(View, { style: styles.statBox },
          React.createElement(Text, { style: styles.statLabel }, 'New Issues'),
          React.createElement(Text, { style: { ...styles.statValue, color: data.metrics.newFindings > 0 ? '#EF4444' : '#10B981' } },
            `${data.metrics.newFindings > 0 ? '+' : ''}${data.metrics.newFindings}`
          )
        ),
        React.createElement(View, { style: styles.statBox },
          React.createElement(Text, { style: styles.statLabel }, 'Fixed Issues'),
          React.createElement(Text, { style: { ...styles.statValue, color: '#10B981' } },
            String(data.metrics.fixedFindings)
          )
        )
      ),

      // Severity Breakdown
      React.createElement(View, { style: { marginBottom: 40 } },
        React.createElement(Text, { style: { fontSize: 14, fontWeight: 700, marginBottom: 15 } }, 'Risk Distribution'),
        React.createElement(View, { style: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between' } },
          React.createElement(Text, { style: { width: '40%', fontSize: 12 } }, 'Severity'),
          React.createElement(Text, { style: { width: '20%', fontSize: 12, textAlign: 'right' } }, 'Count'),
          React.createElement(Text, { style: { width: '40%', fontSize: 12, textAlign: 'right' } }, 'Impact')
        ),
        [
          { label: 'CRITICAL', count: data.metrics.severityCounts.critical, color: '#EF4444' },
          { label: 'HIGH', count: data.metrics.severityCounts.high, color: '#F97316' },
          { label: 'MEDIUM', count: data.metrics.severityCounts.medium, color: '#F59E0B' },
          { label: 'LOW', count: data.metrics.severityCounts.low, color: '#3B82F6' },
        ].map((item, idx) =>
          React.createElement(View, { key: idx, style: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' } },
            React.createElement(Text, { style: { width: '40%', fontSize: 12, fontWeight: 700, color: item.color } }, item.label),
            React.createElement(Text, { style: { width: '20%', fontSize: 12, textAlign: 'right' } }, String(item.count)),
            React.createElement(Text, { style: { width: '40%', fontSize: 12, textAlign: 'right', color: '#6B7280' } },
              item.count > 0 ? 'Action Required' : 'Controlled'
            )
          )
        )
      ),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, 'Generated by Aegis Security Engine'),
        React.createElement(Text, { style: styles.footerText }, 'Page 1 of 1')
      )
    )
  );
};
