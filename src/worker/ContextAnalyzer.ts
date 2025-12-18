import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger.js'

export interface ProjectContext {
    stack: {
        languages: string[]
        frameworks: string[]
        infrastructure: string[]
    }
    structure: string
    critical_files: string[]
    dependencies: string[]
}

export class ContextAnalyzer {
    
    async analyze(workDir: string): Promise<ProjectContext> {
        const context: ProjectContext = {
            stack: {
                languages: [],
                frameworks: [],
                infrastructure: []
            },
            structure: '',
            critical_files: [],
            dependencies: []
        }

        try {
            // Find true root (if zip extracted to a single subdir)
            const projectRoot = this.findProjectRoot(workDir);
            logger.info(`Analyzing project root: ${projectRoot} (base: ${workDir})`);

            // 1. Analyze File Structure & Tree
            context.structure = this.generateFileTree(projectRoot)

            // 2. Detect Stack based on key files
            await this.detectStack(projectRoot, context)

        } catch (error: any) {
            logger.error(`Context analysis failed: ${error.message}`)
        }

        return context
    }

    private findProjectRoot(baseDir: string): string {
        // Check if baseDir has config files
        if (this.hasConfigFiles(baseDir)) return baseDir;

        // If not, check if it has only one directory
        try {
            const items = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && f !== '__MACOSX');
            if (items.length === 1) {
                const subDir = path.join(baseDir, items[0]);
                if (fs.statSync(subDir).isDirectory()) {
                    // Check if subdir has config files
                    if (this.hasConfigFiles(subDir)) return subDir;
                    // Or just return it as a guess
                    return subDir;
                }
            }
        } catch (e) {}
        
        return baseDir;
    }

    private hasConfigFiles(dir: string): boolean {
        const configs = ['package.json', 'pom.xml', 'requirements.txt', 'go.mod', 'composer.json', 'Gemfile', 'mix.exs', 'build.gradle'];
        return configs.some(c => fs.existsSync(path.join(dir, c)));
    }

    private generateFileTree(dir: string, prefix = '', depth = 0, maxDepth = 3): string {
        if (depth > maxDepth) return ''
        
        let output = ''
        try {
            const files = fs.readdirSync(dir)
                .filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'vendor' && f !== 'target' && f !== 'dist')
                .sort()

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const isLast = i === files.length - 1
                const fullPath = path.join(dir, file)
                const stats = fs.statSync(fullPath)
                
                const marker = isLast ? '└── ' : '├── '
                output += `${prefix}${marker}${file}\n`

                if (stats.isDirectory()) {
                    const newPrefix = prefix + (isLast ? '    ' : '│   ')
                    output += this.generateFileTree(fullPath, newPrefix, depth + 1, maxDepth)
                }
            }
        } catch (e) {
            // Ignore errors reading dirs
        }
        return output
    }

    private async detectStack(dir: string, context: ProjectContext) {
        // Node.js
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            context.stack.languages.push('JavaScript/TypeScript')
            context.critical_files.push('package.json')
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
                const deps = { ...pkg.dependencies, ...pkg.devDependencies }
                
                // Extract dependencies
                if (deps) {
                    context.dependencies.push(...Object.keys(deps))
                }

                if (deps['express']) context.stack.frameworks.push('Express')
                if (deps['nestjs'] || deps['@nestjs/core']) context.stack.frameworks.push('NestJS')
                if (deps['vue']) context.stack.frameworks.push('Vue.js')
                if (deps['react']) context.stack.frameworks.push('React')
                if (deps['next']) context.stack.frameworks.push('Next.js')
                if (deps['nuxt']) context.stack.frameworks.push('Nuxt.js')
                if (deps['pinia']) context.stack.frameworks.push('Pinia')
                if (deps['typeorm']) context.stack.frameworks.push('TypeORM')
                if (deps['prisma']) context.stack.frameworks.push('Prisma')
                if (deps['mongoose']) context.stack.frameworks.push('Mongoose')
            } catch (e) {}
        }

        // Python
        if (fs.existsSync(path.join(dir, 'requirements.txt')) || fs.existsSync(path.join(dir, 'Pipfile')) || fs.existsSync(path.join(dir, 'pyproject.toml'))) {
            context.stack.languages.push('Python')
            if (fs.existsSync(path.join(dir, 'requirements.txt'))) {
                context.critical_files.push('requirements.txt')
                try {
                    const reqsContent = fs.readFileSync(path.join(dir, 'requirements.txt'), 'utf-8')
                    const reqs = reqsContent.toLowerCase()
                    
                    // Extract dependencies from requirements.txt
                    const lines = reqsContent.split('\n')
                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (trimmed && !trimmed.startsWith('#')) {
                            // Simple parsing: split by common operators
                            const pkg = trimmed.split(/[=<>~;]/)[0].trim()
                            if (pkg) context.dependencies.push(pkg)
                        }
                    }

                    if (reqs.includes('django')) context.stack.frameworks.push('Django')
                    if (reqs.includes('flask')) context.stack.frameworks.push('Flask')
                    if (reqs.includes('fastapi')) context.stack.frameworks.push('FastAPI')
                } catch (e) {}
            }
        }

        // Java
        if (fs.existsSync(path.join(dir, 'pom.xml'))) {
            context.stack.languages.push('Java')
            context.critical_files.push('pom.xml')
            try {
                const pom = fs.readFileSync(path.join(dir, 'pom.xml'), 'utf-8')
                if (pom.includes('org.springframework.boot')) context.stack.frameworks.push('Spring Boot')
                if (pom.includes('org.springframework.security')) context.stack.frameworks.push('Spring Security')
            } catch (e) {}
        }

        // PHP
        if (fs.existsSync(path.join(dir, 'composer.json'))) {
            context.stack.languages.push('PHP')
            context.critical_files.push('composer.json')
            try {
                const composer = fs.readFileSync(path.join(dir, 'composer.json'), 'utf-8')
                // Basic extraction could be added here similar to Node
                if (composer.includes('laravel/framework')) context.stack.frameworks.push('Laravel')
                if (composer.includes('symfony/framework-bundle')) context.stack.frameworks.push('Symfony')
            } catch (e) {}
        }

        // Go
        if (fs.existsSync(path.join(dir, 'go.mod'))) {
            context.stack.languages.push('Go')
            context.critical_files.push('go.mod')
            try {
                const mod = fs.readFileSync(path.join(dir, 'go.mod'), 'utf-8')
                if (mod.includes('github.com/gin-gonic/gin')) context.stack.frameworks.push('Gin')
                if (mod.includes('github.com/gofiber/fiber')) context.stack.frameworks.push('Fiber')
            } catch (e) {}
        }

        // Infrastructure
        if (fs.existsSync(path.join(dir, 'Dockerfile'))) {
            context.stack.infrastructure.push('Docker')
            context.critical_files.push('Dockerfile')
        }
        if (fs.existsSync(path.join(dir, 'docker-compose.yml')) || fs.existsSync(path.join(dir, 'docker-compose.yaml'))) {
            context.stack.infrastructure.push('Docker Compose')
            context.critical_files.push('docker-compose.yml')
        }
        if (fs.existsSync(path.join(dir, 'k8s')) || fs.existsSync(path.join(dir, 'kubernetes')) || fs.existsSync(path.join(dir, 'helm'))) {
            context.stack.infrastructure.push('Kubernetes')
        }
    }
}
