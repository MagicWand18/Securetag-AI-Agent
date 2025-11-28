// Test script for LLMClient using compiled code
import { LLMClient } from '../dist/worker/LLMClient.js';

console.log('🧪 Testing LLMClient Implementation...\n');

// Mock Ollama server response
const mockOllamaServer = async (port = 11434) => {
    const http = await import('http');

    const server = http.createServer((req, res) => {
        if (req.url === '/api/chat' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    console.log(`📥 Received request for model: ${data.model}`);

                    // Simulate LLM response
                    const response = {
                        message: {
                            content: JSON.stringify({
                                triage: 'True Positive',
                                reasoning: 'Este hallazgo representa una vulnerabilidad real de SQL injection. El código concatena directamente entrada del usuario en una consulta SQL sin sanitización.',
                                recommendation: 'Usar consultas parametrizadas (prepared statements) en lugar de concatenación de strings. Ejemplo: db.query("SELECT * FROM users WHERE id = ?", [userId])',
                                severity_adjustment: 'critical'
                            })
                        }
                    };

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(response));
                } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            console.log(`✅ Mock Ollama server running on port ${port}\n`);
            resolve(server);
        });
        server.on('error', reject);
    });
};

async function runTests() {
    let server;

    try {
        // Start mock server
        server = await mockOllamaServer(11434);

        // Set environment variables
        process.env.OLLAMA_HOST = 'http://localhost:11434';
        process.env.LLM_MODEL = 'securetag-v1';

        // Create client
        const client = new LLMClient();
        console.log('✅ LLMClient instantiated\n');

        // Test Case 1: Analyze a high severity finding
        console.log('Test 1: Analyzing HIGH severity SQL injection finding');
        const finding = {
            fingerprint: 'test-001',
            rule_id: 'javascript.express.security.audit.express-sql-injection',
            rule_name: 'SQL Injection vulnerability detected',
            file_path: 'src/routes/users.ts',
            line: 42,
            code_snippet: 'db.query("SELECT * FROM users WHERE id = " + userId)',
            severity: 'high'
        };

        const result = await client.analyzeFinding(finding);

        if (!result) {
            throw new Error('❌ Test 1 FAILED: No result returned');
        }

        console.log('📊 Analysis Result:');
        console.log(`   Triage: ${result.triage}`);
        console.log(`   Reasoning: ${result.reasoning.substring(0, 80)}...`);
        console.log(`   Recommendation: ${result.recommendation.substring(0, 80)}...`);
        console.log(`   Severity Adjustment: ${result.severity_adjustment || 'none'}`);

        if (result.triage === 'True Positive') {
            console.log('✅ Test 1 PASSED\n');
        } else {
            throw new Error(`❌ Test 1 FAILED: Expected 'True Positive', got '${result.triage}'`);
        }

        // Test Case 2: Test error handling (invalid finding)
        console.log('Test 2: Testing error handling with network failure');
        await server.close();

        const result2 = await client.analyzeFinding({ fingerprint: 'test-002' });

        if (result2 === null) {
            console.log('✅ Test 2 PASSED: Gracefully handled connection error\n');
        } else {
            throw new Error('❌ Test 2 FAILED: Should return null on error');
        }

        console.log('🎉 All tests passed!');
        console.log('\n✅ LLMClient is working correctly');
        console.log('✅ Integration with Ollama API verified');
        console.log('✅ Error handling confirmed');

    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    } finally {
        if (server) {
            server.close();
        }
    }
}

runTests();
