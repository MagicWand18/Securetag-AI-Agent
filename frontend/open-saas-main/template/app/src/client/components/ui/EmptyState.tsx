import { Link } from 'wasp/client/router';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;       // El icono visual (ej: Shield, Search, FileWarning)
  title: string;          // Título claro (ej: "No hay escaneos activos")
  description: string;    // Instrucción breve (ej: "Inicia un nuevo escaneo para ver resultados aquí.")
  actionLabel?: string;   // Texto del botón (Opcional)
  actionTo?: string;      // Ruta de destino (Opcional)
  className?: string;     // Para ajustes extra de margen si hace falta
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-lg bg-slate-950/30 ${className}`}>
      {/* Icono con halo sutil */}
      <div className="p-4 mb-4 rounded-full bg-slate-900/50 border border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <Icon className="w-10 h-10 text-slate-500 opacity-80" />
      </div>
      
      {/* Textos Estilo Terminal */}
      <h3 className="text-lg font-bold text-white mb-2 font-mono tracking-wide uppercase">
        {title}
      </h3>
      <p className="text-sm text-slate-400 max-w-sm mb-8 font-mono leading-relaxed">
        {description}
      </p>

      {/* Botón de Acción (Solo si se provee) */}
      {actionLabel && actionTo && (
        <Link
          to={actionTo as any}
          className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-mono font-medium text-cyan-400 transition-all duration-300 border border-cyan-500/30 rounded hover:bg-cyan-950/30 hover:border-cyan-400 hover:text-cyan-300"
        >
          <span className="mr-2 group-hover:animate-pulse">+</span>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
