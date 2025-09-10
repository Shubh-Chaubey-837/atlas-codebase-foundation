import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, BarChart3, Brain, Zap } from "lucide-react";
import ProjectStructure from "@/components/ProjectStructure";
import { FileUpload } from "@/components/FileUpload";
import { Document } from "@/types/atlas";
import heroImage from "@/assets/atlas-hero.jpg";

const Index = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);

  const handleUploadComplete = (documents: Document[]) => {
    setUploadedDocuments(prev => [...prev, ...documents]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-background/70" />
        
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              Project ATLAS
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Advanced Text & 
              <br />Analytics System
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Intelligent document processing, OCR extraction, and data analytics 
              powered by modern web technologies and Supabase backend services.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Documents
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Upload & Process Documents</DialogTitle>
                  </DialogHeader>
                  <FileUpload onUploadComplete={handleUploadComplete} />
                </DialogContent>
              </Dialog>
              <Button asChild variant="outline" size="lg" className="border-primary/20 hover:bg-primary/5">
                <Link to="/dashboard">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Go to Dashboard
                  {uploadedDocuments.length > 0 && (
                    <Badge className="ml-2">{uploadedDocuments.length}</Badge>
                  )}
                </Link>
              </Button>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300">
                <CardHeader className="pb-3">
                  <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">OCR Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Extract text from PDFs and images using advanced OCR technology
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300">
                <CardHeader className="pb-3">
                  <Brain className="h-8 w-8 text-accent mx-auto mb-2" />
                  <CardTitle className="text-lg">Smart Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    AI-powered document analysis and insights generation
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300">
                <CardHeader className="pb-3">
                  <Zap className="h-8 w-8 text-warning mx-auto mb-2" />
                  <CardTitle className="text-lg">Real-time Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Fast document processing with live status updates
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Project Structure Section */}
      <section className="py-16 border-t border-border/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Project Structure</h2>
              <p className="text-muted-foreground text-lg">
                Modern architecture with React frontend and Supabase backend services
              </p>
            </div>
            
            <ProjectStructure />
            
            <div className="mt-12 p-6 bg-card/30 border border-border/30 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-warning">⚠️ Platform Notes</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Backend:</strong> This platform uses Supabase instead of Flask/Python for backend services</p>
                <p>• <strong>OCR:</strong> Implement using Supabase Edge Functions with external OCR APIs</p>
                <p>• <strong>File Processing:</strong> Leverage Supabase Storage with Edge Functions for PDF processing</p>
                <p>• <strong>Database:</strong> PostgreSQL through Supabase with real-time subscriptions</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
