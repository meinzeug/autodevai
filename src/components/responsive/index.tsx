import React from 'react'

export const HeroText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-4xl md:text-6xl font-bold text-center mb-8">{children}</h1>
)

export const TitleText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xl md:text-4xl font-semibold mb-4">{children}</h2>
)

export const BodyText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-base md:text-lg text-muted-foreground mb-4">{children}</p>
)
