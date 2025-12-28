"use client";

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from "../contexts/LanguageContext";
import { languages } from "../dictionaries/languages";
import Navigation from "../components/Navigation";
import { useRouter } from 'next/navigation';

export default function DoaPage() {
  const canvasRef = useRef(null);
  const { currentLanguage } = useLanguage();
  const t = languages[currentLanguage];
  const [showMessage, setShowMessage] = useState(false);
  const [prayerText, setPrayerText] = useState('');
  const [showPrayerAnimation, setShowPrayerAnimation] = useState(false);
  const [animatedPrayerText, setAnimatedPrayerText] = useState('');
  const [wordPositions, setWordPositions] = useState([]);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load p5.js dynamically
    const loadP5 = async () => {
      if (typeof window !== 'undefined' && !window.p5) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
        script.onload = () => {
          initP5Animation();
        };
        document.head.appendChild(script);
      } else if (window.p5) {
        initP5Animation();
      }
    };

    const initP5Animation = () => {
      if (typeof window !== 'undefined' && window.p5) {
        const p5 = window.p5;
        
        const sketch = (p) => {
          // Parameters
          let NUM_STRINGS = 100;
          let MIN_POINTS = 90;
          let MAX_POINTS = 120;
          let STRING_STEP_SIZE = 1; // Reduced from 3 to 1 for slower movement

          let strings = [];

          p.setup = () => {
            const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
            canvas.parent(canvasRef.current);
            p.colorMode(p.RGB, 255, 255, 255, 255); // Changed to RGB mode
            for (let i = 0; i < NUM_STRINGS; i++) {
              strings.push(new SpiritString(p, p.random(p.width), p.random(p.height)));
            }
            // Pure black background
            p.background(0, 0, 0);
          };

          p.draw = () => {
            // Black background fade for trailing effect
            p.fill(0, 0, 0, 15);
            p.rect(0, 0, p.width, p.height);

            for (let s of strings) {
              s.update();
              s.display();
            }
          };

          p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
          };

          // SpiritString class
          class SpiritString {
            constructor(p, x, y) {
              this.p = p;
              this.origin = p.createVector(x, y);
              this.points = [];
              let len = p.int(p.random(MIN_POINTS, MAX_POINTS));
              for (let i = 0; i < len; i++) {
                this.points.push(p.createVector(x, y));
              }
              this.noiseOffset = p.random(1000);
              this.colorPhase = p.random(p.TWO_PI);
            }

            update() {
              let angle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 2;
              let move = p5.Vector.fromAngle(angle).mult(STRING_STEP_SIZE);
              
              // Calculate new position
              let newX = this.points[0].x + move.x;
              let newY = this.points[0].y + move.y;
              
              // Keep within boundaries
              if (newX < 0) newX = 0;
              if (newX > this.p.width) newX = this.p.width;
              if (newY < 0) newY = 0;
              if (newY > this.p.height) newY = this.p.height;
              
              // Update first point with constrained position
              this.points[0].x = newX;
              this.points[0].y = newY;
              
              // Update trailing points
              for (let i = this.points.length - 1; i > 0; i--) {
                this.points[i] = this.points[i - 1].copy();
              }
              
              this.noiseOffset += 0.005; // Reduced from 0.01 to 0.005 for slower movement
              this.colorPhase += 0.005; // Reduced from 0.01 to 0.005 for slower color changes
            }

            display() {
              this.p.noFill();
              // Alternate between black and purple colors with more variation
              let colorPhase = this.p.sin(this.colorPhase);
              if (colorPhase > 0) {
                // Purple color variations
                let purpleIntensity = this.p.map(this.p.sin(this.colorPhase * 2), -1, 1, 80, 200);
                this.p.stroke(purpleIntensity, 0, purpleIntensity, 80); // Dynamic purple with transparency
              } else {
                // Black color variations
                let blackIntensity = this.p.map(this.p.sin(this.colorPhase * 1.5), -1, 1, 0, 50);
                this.p.stroke(blackIntensity, blackIntensity, blackIntensity, 60); // Dynamic black/gray with transparency
              }
              this.p.strokeWeight(80); // Reduced from 100 for more refined appearance
              this.p.beginShape();
              for (let p of this.points) {
                this.p.curveVertex(p.x, p.y);
              }
              this.p.endShape();
            }
          }
        };
        
        new p5(sketch);
      }
    };

    loadP5();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleSubmit = () => {
    if (prayerText.trim()) {
      const words = prayerText.trim().split(' ');
      const wordData = words.map((word, index) => ({
        text: word,
        id: index,
        startX: Math.random() * 400 - 200, // Random starting X position (-200px to +200px)
        startY: Math.random() * 200 - 100, // Random starting Y position (-100px to +100px)
        endX: Math.random() * 800 - 400,   // Random ending X position (-400px to +400px)
        endY: -300 - Math.random() * 200   // Random ending Y position above screen (-300px to -500px)
      }));
      
      setAnimatedPrayerText(prayerText);
      setWordPositions(wordData);
      setShowPrayerAnimation(true);
      setPrayerText(''); // Clear the textarea
      
      // After 3.5 minutes (210 seconds), hide animation and show message
      setTimeout(() => {
        setShowPrayerAnimation(false);
        setShowMessage(true);
      }, 180000);
    }
  };

  return (
    <div className="font-[var(--font-saira)] bg-black min-h-screen relative overflow-hidden">
      {/* Navigation */}
      <Navigation isMainPage={false} state={0} />
      
      {/* P5.js Canvas Container */}
      <div ref={canvasRef} className="absolute inset-0 z-0"></div>
      
                    {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white px-4">
          <div className="text-center max-w-4xl">
                                      {/* Prayer Animation */}
             {showPrayerAnimation && (
               <div className="fixed inset-0 flex items-center justify-center z-30">
                 <div className="relative w-full h-full">
                   {wordPositions.map((wordData) => (
                     <div
                       key={wordData.id}
                       className="absolute text-xl md:text-2xl font-bold text-white"
                       style={{
                         '--start-x': `${wordData.startX}px`,
                         '--start-y': `${wordData.startY}px`,
                         '--end-x': `${wordData.endX}px`,
                         '--end-y': `${wordData.endY}px`,
                         animation: 'prayerVaporizeUp 5s ease-out forwards',
                         animationDelay: `${wordData.id * 0.1}s`,
                         left: '50%',
                         top: '50%',
                         transform: 'translate(-50%, -50%)'
                       }}
                     >
                       {wordData.text}
                     </div>
                   ))}
                 </div>
               </div>
             )}
            
            {/* Message Display */}
            {showMessage && (
               <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-white/30 shadow-2xl">
                 <p className="text-lg md:text-xl leading-relaxed text-center mb-6">
                   {currentLanguage === 'id' 
                     ? "Akan aku sampaikan, namun aku butuh uang transport, silahkan titipkan melalui kotak amal no 323255"
                     : "I will deliver it, but I need transport money, please send it through my friend's account an dea BCA: 8320766738"
                   }
                 </p>
                 <div className="text-center">
                   <button
                     onClick={() => setShowSurveyModal(true)}
                     className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors shadow-lg"
                   >
                     {currentLanguage === 'id' ? "Kembali ke Menu Utama" : "Back to Main Menu"}
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      
      {/* Input Area - Chatbot Style - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="bg-[#A3A2A2] px-3 py-4 md:px-4 md:py-5">
          <div className="flex space-x-2 md:space-x-3 items-center max-w-4xl mx-auto">
                                      <textarea
               placeholder={currentLanguage === 'id' ? "Ucapkan Doamu Disini..." : "Say Your Prayer Here..."}
               className="flex-1 border bg-white text-black border-none rounded-lg px-3 py-2 md:px-4 md:py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
               rows="1"
               value={prayerText}
               onChange={(e) => setPrayerText(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
             />
             <button
               onClick={handleSubmit}
               className="px-3 py-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors bg-[#DBE8F5] text-black hover:bg-[#C5D8E8]"
             >
               {currentLanguage === 'id' ? "Kirim" : "Send"}
             </button>
          </div>
        </div>
      </div>
      
      {/* Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">
                {currentLanguage === 'id' ? "Survey" : "Survey"}
              </h2>
              <button
                onClick={() => {
                  setShowSurveyModal(false);
                  router.push('/');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="overflow-hidden" style={{ height: 'calc(90vh - 120px)' }}>
              <iframe 
                src="https://docs.google.com/forms/d/e/1FAIpQLSdpOisftkMyYMCmjTeX60x3wDf6kMebbNUTLPOaJbFM1EkBsQ/viewform?embedded=true" 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                marginHeight="0" 
                marginWidth="0"
                title="Survey"
              >
                {currentLanguage === 'id' ? "Memuat…" : "Loading…"}
              </iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
