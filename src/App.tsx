import React, { useState, useEffect } from 'react';
import { Upload, AlertTriangle, CheckCircle, Search, FileText, Shield, Info, BarChart3, Scale, Loader2, Sparkles, FileScan } from 'lucide-react';

// --- Types ---
type RiskLevel = 'High' | 'Medium' | 'Low' | 'Safe';

interface Risk {
  id: string;
  phrase: string;
  level: RiskLevel;
  explanation: string;
  plainEnglish: string;
  category: string;
}

interface AnalysisResult {
  risks: Risk[];
}

// --- CONFIGURATION ---
const apiKey = "AIzaSyCmJnfQ89QBm1xOj6Do6sQT0K59CHjgdg8"; 

// --- API Logic ---
const analyzeContractWithGemini = async (text: string): Promise<Risk[]> => {
  if (!apiKey || apiKey.length < 10) {
    throw new Error("Missing API Key. Please open App.tsx and add your key.");
  }

  const prompt = `
    You are an expert legal AI assistant. Your job is to analyze the following contract text and identify risky clauses.
    
    For each risk found, provide:
    1. The exact short quote from the text ("phrase").
    2. A risk level ("High", "Medium", "Low").
    3. A category (e.g., "Liability", "Privacy", "Termination", "Dispute", "IP").
    4. A technical legal explanation ("explanation").
    5. A "plainEnglish" translation for a non-lawyer (5th-grade reading level).

    Analyze strictly. If the text is safe, return an empty array.
    
    Contract Text:
    "${text.substring(0, 15000)}" 
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      risks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            phrase: { type: "STRING" },
            level: { type: "STRING", enum: ["High", "Medium", "Low"] },
            category: { type: "STRING" },
            explanation: { type: "STRING" },
            plainEnglish: { type: "STRING" }
          },
          required: ["phrase", "level", "category", "explanation", "plainEnglish"]
        }
      }
    }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google API Error:", errorData);
      
      if (response.status === 429) throw new Error("Too many requests! Please wait 1 minute.");
      if (response.status === 404) throw new Error("Model not found. Check your API key.");
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) return [];

    const parsedData = JSON.parse(resultText) as AnalysisResult;
    return parsedData.risks.map(r => ({
      ...r,
      id: Math.random().toString(36).substr(2, 9)
    }));

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

// --- Components ---

const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const colors = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-orange-100 text-orange-700 border-orange-200',
    Low: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Safe: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[level]}`}>
      {level} Risk
    </span>
  );
};

const Header = () => (
  <header className="bg-slate-900 text-white p-4 border-b border-slate-700">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Shield className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Contract<span className="text-blue-400">Scanner</span></h1>
          <p className="text-xs text-slate-400">AI-Powered Legal Risk Detection</p>
        </div>
      </div>
      <nav className="hidden md:flex space-x-6 text-sm font-medium">
        <div className="flex items-center text-xs bg-slate-800 px-3 py-1 rounded-full text-blue-300">
          <Sparkles className="w-3 h-3 mr-1" /> Your One-Step Security Assistant
        </div>
      </nav>
    </div>
  </header>
);

const RiskHeatmap = ({ risks }: { risks: Risk[] }) => {
  const high = risks.filter(r => r.level === 'High').length;
  const medium = risks.filter(r => r.level === 'Medium').length;
  const low = risks.filter(r => r.level === 'Low').length;
  const total = high + medium + low;
   
  if (total === 0) return (
     <div className="flex w-full h-3 rounded-full overflow-hidden mt-2 bg-slate-200"></div>
  );

  return (
    <div className="flex w-full h-3 rounded-full overflow-hidden mt-2 bg-slate-100">
      <div style={{ width: `${(high / total) * 100}%` }} className="bg-red-500 h-full" />
      <div style={{ width: `${(medium / total) * 100}%` }} className="bg-orange-400 h-full" />
      <div style={{ width: `${(low / total) * 100}%` }} className="bg-yellow-400 h-full" />
    </div>
  );
};

export default function App() {
  const [inputTitle, setInputTitle] = useState("SaaS Terms of Service (Example)");
  const [inputText, setInputText] = useState(`TERMS OF SERVICE

1. LIMITATION OF LIABILITY. In no event shall the Company be liable for any indirect, special, incidental, or consequential damages. The total liability of the Company shall not exceed $100.
2. DISPUTE RESOLUTION. Any dispute arising out of this agreement shall be resolved through binding arbitration in the state of Delaware. You hereby waive any right to a jury trial or to participate in a class action lawsuit.
3. TERMINATION. We reserve the right to terminate your account at our sole discretion, without notice, for any reason whatsoever.
4. INDEMNIFICATION. You agree to indemnify and hold harmless the Company from any claims arising out of your use of the Service.
5. DATA USAGE. By using this service, you agree that we may share your data with third parties for marketing purposes.`);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<Risk[]>([]);
  const [score, setScore] = useState(100);
  const [error, setError] = useState<string | null>(null);

  // PDF Extraction State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfLibLoaded, setPdfLibLoaded] = useState<boolean>(false);

  // Load PDF.js from CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const w = window as any;
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfLibLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const extractTextFromPDF = async (file: File) => {
    if (!pdfLibLoaded) {
      alert("PDF Library is still loading. Please try again in a moment.");
      return;
    }

    setIsExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const w = window as any;
      const pdf = await w.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n\n";
      }

      setInputText(fullText);
      setFileName(file.name);
      setInputTitle(file.name.replace('.pdf', ''));
    } catch (error) {
      console.error("Error extracting PDF:", error);
      alert("Failed to extract text from PDF. It might be password protected or scanned image only.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        extractTextFromPDF(file);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        extractTextFromPDF(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setScore(100);

    try {
      const detectedRisks = await analyzeContractWithGemini(inputText);
      setResults(detectedRisks);
      
      let penalty = 0;
      detectedRisks.forEach(r => {
        if (r.level === 'High') penalty += 15;
        if (r.level === 'Medium') penalty += 8;
        if (r.level === 'Low') penalty += 3;
      });
      setScore(Math.max(0, 100 - penalty));
      
    } catch (err: any) {
      setError(err.message || "Failed to analyze contract.");
      setResults([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (s: number) => {
    if (s > 80) return 'text-green-500';
    if (s > 50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Top Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
               <div className={`p-3 rounded-full bg-opacity-10 ${score > 80 ? 'bg-green-500' : 'bg-red-500'}`}>
                  <Scale className={`w-6 h-6 ${getScoreColor(score)}`} />
               </div>
               <div>
                 <p className="text-sm text-slate-500 font-medium uppercase">Safety Score</p>
                 {isAnalyzing ? (
                   <div className="h-9 w-24 bg-slate-200 animate-pulse rounded"></div>
                 ) : (
                   <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}/100</p>
                 )}
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
               <div className="p-3 rounded-full bg-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
               </div>
               <div>
                 <p className="text-sm text-slate-500 font-medium uppercase">High Risks</p>
                 {isAnalyzing ? (
                   <div className="h-9 w-12 bg-slate-200 animate-pulse rounded"></div>
                 ) : (
                   <p className="text-3xl font-bold text-slate-800">
                       {results.filter(r => r.level === 'High').length}
                   </p>
                 )}
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
               <p className="text-sm text-slate-500 font-medium uppercase mb-2">Risk Distribution</p>
               <RiskHeatmap risks={results} />
               <div className="flex justify-between text-xs text-slate-400 mt-2">
                 <span>High</span>
                 <span>Medium</span>
                 <span>Low</span>
               </div>
            </div>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Editor */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* PDF Upload Zone */}
            <div 
              className={`relative border-2 border-dashed rounded-xl p-6 transition-colors text-center cursor-pointer bg-white
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                ${isExtracting ? 'opacity-50 pointer-events-none' : ''}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              
              {isExtracting ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                  <p className="text-sm font-medium text-slate-600">Scanning PDF...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="bg-blue-100 p-2 rounded-full mb-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="font-medium text-slate-700 text-sm">Click to upload PDF or drag & drop</p>
                  {fileName && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      {fileName} loaded
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    className="bg-transparent font-medium text-slate-700 outline-none w-full"
                  />
                </div>
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isAnalyzing ? (
                       <><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Scanning...</>
                   ) : 'Scan Contract'}
                </button>
              </div>
              <textarea 
                className="flex-1 p-6 w-full resize-none outline-none text-slate-600 leading-relaxed text-sm font-mono"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste legal contract here or upload a PDF above..."
              />
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-5 flex flex-col">
             <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-[600px]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-slate-800 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-blue-500" />
                    Detailed Analysis
                  </h2>
                  {results.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {results.length} issues found
                      </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                  {isAnalyzing && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm">Consulting AI Legal Assistant...</p>
                      </div>
                  )}

                  {!isAnalyzing && error && (
                      <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center">
                        <AlertTriangle className="w-12 h-12 mb-2 opacity-50" />
                        <p className="font-semibold">Analysis Failed</p>
                        <p className="text-xs mt-1">{error}</p>
                      </div>
                  )}

                  {!isAnalyzing && !error && results.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                        <CheckCircle className="w-12 h-12 mb-2 opacity-20 text-green-500" />
                        <p>Ready to Scan</p>
                        <p className="text-xs mt-2">Click the "Scan Contract" button to begin.</p>
                     </div>
                  )}

                  {!isAnalyzing && !error && results.map((risk) => (
                      <div key={risk.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition duration-200 group">
                        <div className="flex justify-between items-start mb-2">
                           <RiskBadge level={risk.level} />
                           <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{risk.category}</span>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-slate-800 border-l-2 border-slate-300 pl-3 italic">
                              "{risk.phrase}"
                          </p>
                        </div>

                        <div className="space-y-3">
                           <div className="bg-red-50 p-3 rounded-md border border-red-100">
                              <div className="flex items-start">
                                 <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 mr-2 shrink-0" />
                                 <p className="text-xs text-red-800">{risk.explanation}</p>
                              </div>
                           </div>

                           <div className="bg-blue-50 p-3 rounded-md border border-blue-100 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-1">
                                <span className="text-[10px] font-bold text-blue-300 uppercase">AI Simplified</span>
                              </div>
                              <div className="flex items-start">
                                 <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 shrink-0" />
                                 <p className="text-xs text-blue-900 leading-relaxed font-medium">
                                    {risk.plainEnglish}
                                 </p>
                              </div>
                           </div>
                        </div>
                      </div>
                  ))}
                </div>
             </div>
          </div>

        </div>

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
           {[
            { title: "Verdict Scoring", icon: <Shield className="w-5 h-5"/>, desc: "Automated 0-100 safety rating." },
            { title: "Risk Heatmap", icon: <BarChart3 className="w-5 h-5"/>, desc: "Visual distribution of contract dangers." },
            { title: "Smart Scan", icon: <FileScan className="w-5 h-5"/>, desc: "Instant PDF Insight." },
            { title: "Plain English", icon: <Info className="w-5 h-5"/>, desc: "Legalese translated to 5th-grade level." },
             
             
           ].map((f, i) => (
             <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center text-center">
                <div className="p-2 bg-slate-100 rounded-full mb-2 text-slate-700">{f.icon}</div>
                <h3 className="font-bold text-slate-800 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
             </div>
           ))}
        </div>

      </main>
    </div>
  );
}
