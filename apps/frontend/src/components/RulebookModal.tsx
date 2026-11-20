import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Award,
  Users,
  MapPin,
  Calendar,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Laptop,
  GraduationCap,
} from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'format' | 'venue' | 'document'>('overview');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#02130a] border-2 border-emerald-400/50 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.35)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-900/60 bg-gradient-to-r from-emerald-950/80 via-[#01140a] to-emerald-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                  GM UNIVERSITY • STUDENT AFFAIRS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  OFFICIAL RULE BOOK
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>IGNITRON 2K26 — CODING COLLAB</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 hover:text-white transition-all"
              title="Print Rule Book"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-rose-950/50 hover:border-rose-500/50 hover:text-rose-300 transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-emerald-950/80 bg-[#010c06] overflow-x-auto text-xs font-mono font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                : 'text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-950/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Overview & Eligibility</span>
          </button>

          <button
            onClick={() => setActiveTab('format')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'format'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                : 'text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-950/50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>2. Format & Judging</span>
          </button>

          <button
            onClick={() => setActiveTab('venue')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'venue'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                : 'text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-950/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>3. Venue, Prizes & Contacts</span>
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'document'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                : 'text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-950/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>4. Complete Document</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 text-sm leading-relaxed flex-1">
          {/* TAB 1: OVERVIEW & ELIGIBILITY */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Event Description Card */}
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  Event Description
                </span>
                <p className="text-sm text-emerald-100 font-medium">
                  Code Relay is a team coding competition where two minds build one solution. Teams solve MCQs, debug faulty code in a mission-style challenge and build one program in the Final Boss round.
                </p>
                <div className="pt-2 text-xs font-mono text-emerald-400 font-bold">
                  Tagline: "Two Minds, One Code, One Victory"
                </div>
              </div>

              {/* Objectives Grid */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Competition Objectives</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/15 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Promote logical and analytical thinking.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/15 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Strengthen programming and algorithmic skills.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/15 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Build debugging, testing and error-handling skills.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/15 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Encourage efficient, optimized algorithms.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/15 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Improve teamwork, communication and adaptability.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/15 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Test understanding of code through explanations.</span>
                  </div>
                </div>
              </div>

              {/* Eligibility & Registration Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>Eligibility Requirements</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-emerald-100/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Open to all students across India.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Team of exactly 2 members.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>One laptop per team allowed.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Official Languages: <strong>C, C++, Java or Python</strong>.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-400/30 space-y-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-400" />
                    <span>Registration Details</span>
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-emerald-900/60">
                      <span className="text-emerald-300/70">Registration Fee:</span>
                      <span className="text-amber-400 font-bold">₹500/- per Team</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-emerald-900/60">
                      <span className="text-emerald-300/70">Deadline Date:</span>
                      <span className="text-white font-bold">30/11/2026</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-emerald-300/70">Powered by:</span>
                      <span className="text-emerald-400 font-bold">Unstop</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORMAT & JUDGING CRITERIA */}
          {activeTab === 'format' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  Event Format (3 Rounds)
                </span>
                <p className="text-xs text-emerald-200/80">
                  The event is conducted strictly in 3 rounds. Teams must report on time.
                </p>
              </div>

              {/* 3 Rounds Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2">
                  <div className="text-xs font-mono font-bold text-emerald-400">ROUND 1</div>
                  <h4 className="font-bold text-white text-sm">MCQ Arena (30 Marks)</h4>
                  <p className="text-xs text-emerald-200/70">
                    15 MCQs × 2 marks, <strong>no negative marking</strong>.
                  </p>
                  <div className="text-[11px] font-mono text-emerald-300 pt-1 border-t border-emerald-900/60">
                    Top 50% advance to Round 2.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2">
                  <div className="text-xs font-mono font-bold text-emerald-400">ROUND 2</div>
                  <h4 className="font-bold text-white text-sm">Bug Hunt Arena (100 Marks)</h4>
                  <p className="text-xs text-emerald-200/70">
                    Fix buggy codebase and pass hidden tests.
                  </p>
                  <div className="text-[11px] font-mono text-emerald-300 pt-1 border-t border-emerald-900/60">
                    Top 5–8 teams advance to Round 3.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-400/40 space-y-2">
                  <div className="text-xs font-mono font-bold text-amber-400">ROUND 3 (FINALS)</div>
                  <h4 className="font-bold text-white text-sm">Final Boss (100 Marks)</h4>
                  <p className="text-xs text-emerald-200/70">
                    Build one program: the IGNITRON Event Analytics Engine.
                  </p>
                  <div className="text-[11px] font-mono text-amber-300 pt-1 border-t border-amber-900/60">
                    Finalists compete for Winner & Runner-up.
                  </div>
                </div>
              </div>

              {/* Detailed Scoring Rubrics */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">Judging Criteria & Rubric Breakdown</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Round 2 Rubric */}
                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs">
                    <span className="font-bold text-emerald-300 block">Round 2 Rubric (100 Marks)</span>
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>• Bug Identification:</span>
                        <span className="text-emerald-400 font-bold">20 Marks</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>• Test Correctness:</span>
                        <span className="text-emerald-400 font-bold">50 Marks</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>• Edge Cases:</span>
                        <span className="text-emerald-400 font-bold">20 Marks</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>• Code Quality / Efficiency:</span>
                        <span className="text-emerald-400 font-bold">10 Marks</span>
                      </div>
                    </div>
                  </div>

                  {/* Round 3 Rubric Table */}
                  <div className="p-4 rounded-xl bg-black/40 border border-amber-500/30 space-y-2 text-xs">
                    <span className="font-bold text-amber-300 block">Round 3: Final Boss Challenge (100 Marks)</span>
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>• Case 1 (Basic score calc & ranking):</span>
                        <span className="text-amber-400 font-bold">20 Marks</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>• Case 2 (Invalid records & duplicates):</span>
                        <span className="text-amber-400 font-bold">25 Marks</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>• Case 3 (Advanced ranking & Top K):</span>
                        <span className="text-amber-400 font-bold">45 Marks</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>• Code Quality (Clean & efficient):</span>
                        <span className="text-amber-400 font-bold">10 Marks</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disqualification Clause */}
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-300 block mb-0.5">Disqualification Policy:</strong>
                    Cheating, plagiarism or unauthorized assistance (internet, phones or AI) will lead to immediate disqualification.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATE, VENUE & CONTACTS */}
          {activeTab === 'venue' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date & Venue */}
                <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Event Date & Venue</span>
                  </div>
                  <div className="space-y-2 text-xs text-emerald-100/90">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                      <span className="font-bold text-white block">Date:</span>
                      <span>5th December 2026</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                      <span className="font-bold text-white block">Venue:</span>
                      <span>GMS Block, 3rd Floor, Room No. 310, GM University, Davangere – 577006</span>
                    </div>
                  </div>
                </div>

                {/* Prizes */}
                <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-400/40 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Award className="w-4 h-4" />
                    <span>Prizes & Recognition</span>
                  </div>
                  <ul className="space-y-2 text-xs text-amber-100/90">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Exciting prizes & trophies</strong> for tournament winners & runner-up.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Official E-Certificates</strong> for all participating contestants.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Event Coordinators */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Official Event Coordinators</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Faculty Coordinators */}
                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
                    <span className="text-emerald-400 font-bold block uppercase tracking-wider text-[11px]">
                      Faculty Coordinators
                    </span>
                    <div className="space-y-1.5 text-slate-200">
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>Varun K S:</span>
                        <a href="tel:7815908752" className="text-emerald-300 hover:underline">
                          +91 78159 08752
                        </a>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Sahana K E:</span>
                        <a href="tel:8310305461" className="text-emerald-300 hover:underline">
                          +91 83103 05461
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Student Coordinators */}
                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
                    <span className="text-emerald-400 font-bold block uppercase tracking-wider text-[11px]">
                      Student Coordinators
                    </span>
                    <div className="space-y-1.5 text-slate-200">
                      <div className="flex justify-between py-1 border-b border-emerald-950/70">
                        <span>Karun H G:</span>
                        <a href="tel:6363907325" className="text-emerald-300 hover:underline">
                          +91 63639 07325
                        </a>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Preetham V R:</span>
                        <a href="tel:6363045415" className="text-emerald-300 hover:underline">
                          +91 63630 45415
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMPLETE PRINTABLE DOCUMENT */}
          {activeTab === 'document' && (
            <div className="space-y-6 bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-inner font-sans text-xs leading-relaxed animate-fade-in">
              <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                <div className="text-sm font-black uppercase tracking-wider text-emerald-950">
                  GM UNIVERSITY • DAVANGERE – 577006
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-600">
                  STUDENT AFFAIRS • THE NATIONAL LEVEL TECH FEST
                </div>
                <div className="text-2xl font-black italic tracking-tight text-slate-950 mt-1">
                  IGNITRON 2K26 — CODING COLLAB
                </div>
                <div className="text-xs font-mono font-bold text-emerald-700 tracking-widest uppercase">
                  Two Minds, One Code, One Victory • Official Rule Book
                </div>
              </div>

              <div className="space-y-4 text-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-slate-950 uppercase mb-1">1. Event Description & Objectives</h4>
                  <p>
                    Code Relay is a team coding competition where two minds build one solution. Teams solve MCQs, debug faulty code in a mission-style challenge and build one program in the Final Boss round. Objectives: Promote logical thinking, strengthen programming/algorithmic skills, error handling, communication, and adaptability.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-950 uppercase mb-1">2. Eligibility & Registration</h4>
                  <p>
                    Open to all students across India. Teams of 2 members. Exactly one laptop per team. Permitted languages: C, C++, Java or Python. Registration fee: ₹500/- per Team. Deadline: 30/11/2026.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-950 uppercase mb-1">3. Event Format & Judging Criteria</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Round 1 — MCQ Arena:</strong> 15 MCQs × 2 marks = 30 marks (no negative marking). Top 50% advance to Round 2.</li>
                    <li><strong>Round 2 — Bug Hunt Arena (100 marks):</strong> Bug identification (20), Test correctness (50), Edge cases (20), Code quality (10). Top 5–8 teams advance.</li>
                    <li><strong>Round 3 — Final Boss Coding (100 marks):</strong> Case 1 Basic score calc (20), Case 2 Invalid records & duplicates (25), Case 3 Advanced ranking & Top K (45), Code quality (10).</li>
                    <li><strong>Disqualification:</strong> Cheating, plagiarism, unauthorized internet, phones, or AI assistance leads to immediate disqualification.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-950 uppercase mb-1">4. Date, Venue & Contacts</h4>
                  <p>
                    <strong>Date:</strong> 5th December 2026 | <strong>Venue:</strong> GMS Block, 3rd Floor, Room No. 310, GM University, Davangere.<br />
                    <strong>Faculty Coordinators:</strong> Varun K S (78159 08752), Sahana K E (83103 05461)<br />
                    <strong>Student Coordinators:</strong> Karun H G (63639 07325), Preetham V R (63630 45415)
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-300 text-center font-mono text-[10px] text-slate-500">
                Powered by Unstop • GM University IGNITRON 2K26 Technical Steering Committee
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-emerald-900/60 bg-[#010c06] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-mono text-emerald-300/80">
            Official GM University IGNITRON 2K26 Document
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)]"
          >
            Close Rule Book
          </button>
        </div>
      </div>
    </div>
  );
};
