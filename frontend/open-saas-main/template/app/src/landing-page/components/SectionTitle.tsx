
export default function SectionTitle({
  title,
  subtitle,
  description,
  align = "center",
}: {
  title: string | React.ReactNode;
  subtitle?: string;
  description?: string | React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={`mx-auto mb-16 max-w-3xl ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {subtitle && (
        <div
          className={`inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-mono tracking-widest uppercase transition-colors ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          {subtitle}
        </div>
      )}

      <div className={`relative inline-block ${align === 'center' ? 'px-12' : ''}`}>
        {align === 'center' && (
           <>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-[1px] bg-gradient-to-r from-transparent to-blue-500/50"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-[1px] bg-gradient-to-l from-transparent to-blue-500/50"></div>
           </>
        )}
        {typeof title === "string" ? (
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl font-sans relative inline-block transition-colors">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 mr-2 opacity-50">
              //
            </span>
            {title}
          </h3>
        ) : (
          title
        )}
      </div>

      {description && (
        <div className="mt-6 relative inline-block text-left">
          {align !== "center" && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/50 to-transparent rounded-full" />
          )}
          <p
            className={`text-black dark:text-slate-400 text-lg leading-relaxed transition-colors ${
              align !== "center" ? "pl-6" : ""
            }`}
          >
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
