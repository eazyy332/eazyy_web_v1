import React, { useState } from 'react';
import { Calendar, Package, Truck, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

// Image imports (replace with actual paths)
import Step1 from '/images/howitworks/step1.png'; // Schedule Pickup
import Step2 from '/images/howitworks/step2.png'; // Collection
import Step3 from '/images/howitworks/step3.png'; // Cleaning
import Step4 from '/images/howitworks/step4.png'; // Delivery

const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const steps = [
    {
      icon: Calendar,
      title: "Schedule a Pickup",
      description: "Use our app to schedule a pickup at your convenience.",
      color: "bg-blue-700",
      illustration: <img src={Step1} alt="Schedule Pickup" className="rounded-xl w-full object-cover max-h-[400px]" />
    },
    {
      icon: Package,
      title: "We Collect Your Laundry",
      description: "Our driver picks up your laundry directly from your door.",
      color: "bg-indigo-700",
      illustration: <img src={Step2} alt="Collect Laundry" className="rounded-xl w-full object-cover max-h-[400px]" />
    },
    {
      icon: Sparkles,
      title: "Professional Cleaning",
      description: "Your clothes are cleaned with great care by our team.",
      color: "bg-purple-700",
      illustration: <img src={Step3} alt="Cleaning" className="rounded-xl w-full object-cover max-h-[400px]" />
    },
    {
      icon: Truck,
      title: "Delivery to Your Door",
      description: "We deliver your clean clothes, folded and ready to wear.",
      color: "bg-cyan-700",
      illustration: <img src={Step4} alt="Delivery" className="rounded-xl w-full object-cover max-h-[400px]" />
    }
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextStep();
    else if (distance < -50) prevStep();
  };

  const nextStep = () => setActiveStep((prev) => (prev === steps.length - 1 ? 0 : prev + 1));
  const prevStep = () => setActiveStep((prev) => (prev === 0 ? steps.length - 1 : prev - 1));

  return (
    <section id="services" ref={ref} className="py-12 sm:py-24 bg-gradient-to-b from-blue-100 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-16 transition-opacity duration-700 ease-in-out">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the simplicity of our laundry service in just a few steps
          </p>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden">
          <div
            className="relative overflow-hidden touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="mb-6">
              <div className="bg-blue-50 rounded-xl p-6 mb-6 min-h-[300px] flex items-center justify-center">
                {steps[activeStep].illustration}
              </div>

              <div className={`p-4 sm:p-6 rounded-xl ${steps[activeStep].color} text-white`}>
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/20 flex items-center justify-center">
                    {React.createElement(steps[activeStep].icon, {
                      size: 24,
                      className: 'text-white'
                    })}
                  </div>
                  <h3 className="ml-3 text-lg sm:text-xl font-bold">{steps[activeStep].title}</h3>
                </div>
                <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                  {steps[activeStep].description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4">
            <button onClick={prevStep} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700" aria-label="Previous step">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${activeStep === index ? steps[index].color : 'bg-gray-300'}`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            <button onClick={nextStep} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700" aria-label="Next step">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid grid-cols-5 gap-8 max-w-6xl mx-auto">
          <div className="col-span-2 space-y-4">
            {steps.map((step, index) => (
              <button
                key={index}
                className={`w-full p-6 rounded-xl text-left transition-all duration-300 ${
                  activeStep === index ? `${step.color} text-white shadow-lg` : 'bg-white hover:bg-gray-50 text-gray-800 shadow hover:shadow-md'
                }`}
                onClick={() => setActiveStep(index)}
              >
                <div className="flex items-center mb-3">
                  <div className={`w-12 h-12 rounded-lg ${activeStep === index ? 'bg-white/20' : step.color} flex items-center justify-center`}>
                    {React.createElement(step.icon, {
                      size: 24,
                      className: 'text-white'
                    })}
                  </div>
                  <h3 className="ml-4 text-xl font-bold">{step.title}</h3>
                </div>
                <p className={activeStep === index ? 'text-white/90' : 'text-gray-600'}>
                  {step.description}
                </p>
              </button>
            ))}
          </div>

          <div className="col-span-3 bg-blue-50 rounded-xl p-8 flex items-center justify-center min-h-[500px]">
            {steps[activeStep].illustration}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
