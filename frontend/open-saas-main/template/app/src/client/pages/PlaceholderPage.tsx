import React from 'react';
import { Link } from 'react-router-dom';

export default function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">🚧 En Construcción</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Esta funcionalidad está siendo implementada como parte de la Fase 1.
      </p>
      <Link 
        to="/" 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
