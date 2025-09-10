import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder, Code, Database, Settings, Globe } from "lucide-react";

const ProjectStructure = () => {
  const frontendStructure = [
    { name: "src/", type: "folder", icon: Folder },
    { name: "├── components/", type: "folder", icon: Folder },
    { name: "│   ├── Dashboard/", type: "folder", icon: Folder },
    { name: "│   ├── Analytics/", type: "folder", icon: Folder },
    { name: "│   ├── FileUpload/", type: "folder", icon: Folder },
    { name: "│   └── Visualization/", type: "folder", icon: Folder },
    { name: "├── services/", type: "folder", icon: Folder },
    { name: "│   ├── api.ts", type: "file", icon: Code },
    { name: "│   └── ocr.ts", type: "file", icon: Code },
    { name: "├── types/", type: "folder", icon: Folder },
    { name: "│   └── atlas.ts", type: "file", icon: Code },
    { name: "├── utils/", type: "folder", icon: Folder },
    { name: "│   └── dataProcessing.ts", type: "file", icon: Code },
    { name: "└── App.tsx", type: "file", icon: Code },
  ];

  const backendAlternative = [
    { name: "Supabase Integration", type: "service", icon: Database },
    { name: "├── Authentication", type: "service", icon: Settings },
    { name: "├── File Storage", type: "service", icon: FileText },
    { name: "├── Database (PostgreSQL)", type: "service", icon: Database },
    { name: "├── Edge Functions", type: "service", icon: Code },
    { name: "│   ├── PDF Processing", type: "function", icon: FileText },
    { name: "│   ├── OCR Processing", type: "function", icon: Code },
    { name: "│   └── Data Analysis", type: "function", icon: Code },
    { name: "└── Real-time Subscriptions", type: "service", icon: Globe },
  ];

  const dependencies = [
    { name: "React 18", type: "frontend" },
    { name: "TypeScript", type: "frontend" },
    { name: "Vite", type: "build" },
    { name: "Tailwind CSS", type: "styling" },
    { name: "D3.js", type: "visualization" },
    { name: "Axios", type: "http" },
    { name: "Supabase", type: "backend" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Frontend Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {frontendStructure.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <code className="text-foreground font-mono">{item.name}</code>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" />
            Backend Services
            <Badge variant="secondary" className="ml-auto">Supabase</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {backendAlternative.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{item.name}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-success" />
            Dependencies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dependencies.map((dep, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{dep.name}</span>
              <Badge variant="outline" className="text-xs">
                {dep.type}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectStructure;