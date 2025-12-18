export interface AIAnalysisResult {
    triage: 'True Positive' | 'False Positive' | 'Needs Review';
    reasoning: string;
    recommendation: string;
    severity_adjustment: 'critical' | 'high' | 'medium' | 'low' | 'info';
    confidence_score: number;
    raw_response?: string;
}

export interface AIProvider {
    name: string;
    modelName: string;
    analyzeFinding(finding: any, projectContext: any, promptTemplate: string): Promise<AIAnalysisResult>;
}
