type DiagnosticNavigator = Navigator & {
  deviceMemory?: number;
  userAgentData?: { platform?: string };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
};

export function buildDebugReport({
  message,
  errorDebug,
  episodeUrl,
}: {
  message: string;
  errorDebug: string;
  episodeUrl: string;
}): string {
  return [
    "Hej Enhao,",
    "",
    "Jeg har oplevet denne fejl flere gange:",
    message,
    "",
    `Episode: ${episodeUrl || "Ikke tilgængelig"}`,
    "",
    "Tekniske oplysninger:",
    ...browserDiagnosticLines(),
    "",
    "OpenAI-fejloplysninger:",
    errorDebug,
    "",
  ].join("\n");
}

function browserDiagnosticLines(): string[] {
  if (typeof window === "undefined") {
    return ["Browsermiljø: Ikke tilgængeligt"];
  }

  const diagnosticNavigator = navigator as DiagnosticNavigator;
  const connection = diagnosticNavigator.connection;
  return [
    `Tidspunkt i browser: ${new Date().toISOString()}`,
    `Side: ${window.location.href}`,
    `Browser: ${navigator.userAgent}`,
    `Platform: ${diagnosticNavigator.userAgentData?.platform || navigator.platform || "Ukendt"}`,
    `Sprog: ${navigator.languages.join(", ") || navigator.language || "Ukendt"}`,
    `Tidszone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || "Ukendt"}`,
    `Vindue: ${window.innerWidth} × ${window.innerHeight} px @ ${window.devicePixelRatio}x`,
    `Skærm: ${window.screen.width} × ${window.screen.height} px`,
    `Online: ${navigator.onLine ? "Ja" : "Nej"}`,
    `CPU-tråde: ${navigator.hardwareConcurrency || "Ukendt"}`,
    `Enhedshukommelse: ${diagnosticNavigator.deviceMemory ? `${diagnosticNavigator.deviceMemory} GB` : "Ukendt"}`,
    `Netværk: ${connection?.effectiveType || "Ukendt"}; downlink ${connection?.downlink ?? "ukendt"} Mbit/s; RTT ${connection?.rtt ?? "ukendt"} ms; datasparefunktion ${connection?.saveData ? "til" : "fra/ukendt"}`,
  ];
}
