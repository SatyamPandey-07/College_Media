import { useState } from 'react';
import './ATSResume.css';

const ATSResume = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeData, setResumeData] = useState({
    name: '',
    email: '',
    phone: '',
    summary: '',
    experience: '',
    projects: '',
    skills: '',
    education: ''
  });
  const [optimizedResume, setOptimizedResume] = useState(null);
  const [loading, setLoading] = useState(false);

  const extractKeywords = (text) => {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can']);
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const frequency = {};
    
    words.forEach(word => {
      if (!commonWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  };

  const optimizeContent = (content, keywords) => {
    if (!content) return content;
    
    let optimized = content;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    
    keywords.slice(0, 10).forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (!regex.test(optimized)) {
        const relevantSentence = sentences.find(s => 
          s.toLowerCase().includes('develop') || 
          s.toLowerCase().includes('work') || 
          s.toLowerCase().includes('create')
        );
        if (relevantSentence && sentences.length > 0) {
          optimized = optimized.replace(
            relevantSentence,
            `${relevantSentence.trim()}, utilizing ${keyword}`
          );
        }
      }
    });
    
    return optimized;
  };

  const generateOptimizedResume = () => {
    setLoading(true);
    
    setTimeout(() => {
      const keywords = extractKeywords(jobDescription);
      
      const optimized = {
        ...resumeData,
        summary: optimizeContent(resumeData.summary, keywords) || 
          `Results-driven professional with expertise in ${keywords.slice(0, 5).join(', ')}. Proven track record in delivering high-quality solutions aligned with business objectives.`,
        experience: optimizeContent(resumeData.experience, keywords),
        projects: optimizeContent(resumeData.projects, keywords),
        skills: resumeData.skills || keywords.slice(0, 15).join(', '),
        keywords: keywords
      };
      
      setOptimizedResume(optimized);
      setLoading(false);
    }, 1500);
  };

  const handleInputChange = (field, value) => {
    setResumeData(prev => ({ ...prev, [field]: value }));
  };

  const downloadResume = () => {
    const content = `
${optimizedResume.name}
${optimizedResume.email} | ${optimizedResume.phone}

PROFESSIONAL SUMMARY
${optimizedResume.summary}

EXPERIENCE
${optimizedResume.experience}

PROJECTS
${optimizedResume.projects}

SKILLS
${optimizedResume.skills}

EDUCATION
${optimizedResume.education}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ATS_Optimized_Resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ats-resume-container">
      <div className="ats-header">
        <h1>🎯 ATS Resume Optimizer</h1>
        <p>Generate role-specific, ATS-friendly resumes tailored to job descriptions</p>
      </div>

      <div className="ats-content">
        <div className="input-section">
          <div className="job-description-box">
            <h2>📋 Job Description</h2>
            <textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={10}
            />
          </div>

          <div className="resume-inputs">
            <h2>👤 Your Information</h2>
            
            <input
              type="text"
              placeholder="Full Name"
              value={resumeData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            
            <input
              type="email"
              placeholder="Email"
              value={resumeData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
            
            <input
              type="tel"
              placeholder="Phone"
              value={resumeData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
            
            <textarea
              placeholder="Professional Summary (optional - will be auto-generated if empty)"
              value={resumeData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              rows={4}
            />
            
            <textarea
              placeholder="Work Experience"
              value={resumeData.experience}
              onChange={(e) => handleInputChange('experience', e.target.value)}
              rows={6}
            />
            
            <textarea
              placeholder="Projects"
              value={resumeData.projects}
              onChange={(e) => handleInputChange('projects', e.target.value)}
              rows={6}
            />
            
            <textarea
              placeholder="Skills (optional - will be extracted from job description if empty)"
              value={resumeData.skills}
              onChange={(e) => handleInputChange('skills', e.target.value)}
              rows={3}
            />
            
            <textarea
              placeholder="Education"
              value={resumeData.education}
              onChange={(e) => handleInputChange('education', e.target.value)}
              rows={3}
            />
          </div>

          <button 
            className="generate-btn"
            onClick={generateOptimizedResume}
            disabled={!jobDescription || !resumeData.name || loading}
          >
            {loading ? '⏳ Optimizing...' : '✨ Generate ATS-Optimized Resume'}
          </button>
        </div>

        {optimizedResume && (
          <div className="output-section">
            <div className="output-header">
              <h2>✅ Optimized Resume</h2>
              <button className="download-btn" onClick={downloadResume}>
                📥 Download
              </button>
            </div>

            <div className="resume-preview">
              <div className="resume-header-section">
                <h3>{optimizedResume.name}</h3>
                <p>{optimizedResume.email} | {optimizedResume.phone}</p>
              </div>

              <div className="resume-section">
                <h4>PROFESSIONAL SUMMARY</h4>
                <p>{optimizedResume.summary}</p>
              </div>

              {optimizedResume.experience && (
                <div className="resume-section">
                  <h4>EXPERIENCE</h4>
                  <p>{optimizedResume.experience}</p>
                </div>
              )}

              {optimizedResume.projects && (
                <div className="resume-section">
                  <h4>PROJECTS</h4>
                  <p>{optimizedResume.projects}</p>
                </div>
              )}

              <div className="resume-section">
                <h4>SKILLS</h4>
                <p>{optimizedResume.skills}</p>
              </div>

              {optimizedResume.education && (
                <div className="resume-section">
                  <h4>EDUCATION</h4>
                  <p>{optimizedResume.education}</p>
                </div>
              )}

              <div className="keywords-section">
                <h4>🔑 Matched Keywords</h4>
                <div className="keywords-tags">
                  {optimizedResume.keywords.slice(0, 15).map((keyword, idx) => (
                    <span key={idx} className="keyword-tag">{keyword}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSResume;
