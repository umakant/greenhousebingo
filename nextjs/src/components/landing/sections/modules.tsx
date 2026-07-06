"use client";

import { useState } from "react";
import { ChevronDown, Monitor } from "lucide-react";
import { getImagePath } from "@/components/landing/utils";

const MODULES_VARIANTS = {
  modules1: {
    section: "bg-white py-20",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6 text-center",
    subtitle: "text-lg text-slate-700 mb-16 text-center max-w-3xl mx-auto",
    layout: "tabs",
  },
  modules2: {
    section: "bg-gray-50 py-20",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6 text-center",
    subtitle: "text-lg text-slate-700 mb-16 text-center",
    layout: "cards",
  },
  modules3: {
    section: "bg-white py-20",
    container: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6 text-center",
    subtitle: "text-lg text-slate-700 mb-16 text-center",
    layout: "accordion",
  },
  modules4: {
    section: "bg-gray-900 py-20",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-white mb-6 text-center",
    subtitle: "text-lg text-gray-300 mb-16 text-center",
    layout: "slider",
  },
  modules5: {
    section: "bg-white py-20",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6 text-center",
    subtitle: "text-lg text-slate-700 mb-16 text-center",
    layout: "grid",
  },
} as const;

export default function Modules({ settings }: { settings?: any }) {
  const sectionData = settings?.config_sections?.sections?.modules || {};
  const variant = sectionData.variant || "modules1";
  const config = (MODULES_VARIANTS as any)[variant] || MODULES_VARIANTS.modules1;

  const isModulesEnabled = settings?.config_sections?.section_visibility?.modules !== false;
  if (!isModulesEnabled) return null;

  const title = sectionData.title || "Complete Business Solutions";
  const subtitle =
    sectionData.subtitle ||
    "Discover our comprehensive modules designed to streamline every aspect of your business operations";
  const colors = settings?.config_sections?.colors || { primary: "#10b981", secondary: "#059669", accent: "#f59e0b" };
  const [activeTab, setActiveTab] = useState(0);
  const [openAccordion, setOpenAccordion] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  const defaultModules = [
    {
      key: "taskly",
      label: "Project",
      title: "Project Management System",
      description:
        "Organize and track projects efficiently with comprehensive project management tools. Manage tasks, milestones, and deadlines with team collaboration in one centralized platform. Track progress with Gantt charts and Kanban boards, assign tasks and set priorities, monitor project timelines and deliverables, and generate detailed project reports. Perfect for teams of any size.",
      image: "",
    },
    {
      key: "account",
      label: "Accounting",
      title: "Complete Accounting & Financial Management",
      description:
        "Streamline your financial operations with our comprehensive accounting system. Manage invoices, bills, and payments, track income and expenses, perform bank account reconciliation, and generate detailed financial reports. Professional invoice generation, vendor and customer management, tax calculations and compliance, with real-time financial analytics.",
      image: "",
    },
    {
      key: "hrm",
      label: "HRM",
      title: "Human Resource Management System",
      description:
        "Complete employee management solution for modern businesses. Manage employee records and profiles, attendance and leave management, payroll processing and automation, and performance evaluations. Handle department and designation management, recruitment process handling, employee benefits management, and comprehensive HR reporting.",
      image: "",
    },
    {
      key: "lead",
      label: "CRM",
      title: "Customer Relationship Management",
      description:
        "Build stronger customer relationships and boost sales with our powerful CRM system. Manage leads and contacts, track sales pipeline, handle deal and opportunity management, and monitor customer interaction tracking. Automate follow-ups, analyze sales performance, forecast revenue, and maintain customer communication history.",
      image: "",
    },
    {
      key: "pos",
      label: "POS",
      title: "Point of Sale System",
      description:
        "Fast, reliable point-of-sale solution for retail and service businesses. Process transactions quickly, manage inventory in real-time, handle multiple payment methods, and generate instant receipts. Track product stock, support barcode scanning, handle returns and exchanges, and generate comprehensive sales reports.",
      image: "",
    },
    {
      key: "productservice",
      label: "Product & Service",
      title: "Product & Service Management",
      description:
        "Efficiently manage your complete products and services catalog. Organize product categories, manage inventory levels, implement pricing strategies and variations, and handle product attributes. Manage stock across multiple locations, set up automated reorder points, track product performance, and maintain detailed product specifications.",
      image: "",
    },
  ];

  const modules = sectionData.modules?.length > 0 ? sectionData.modules : defaultModules;

  const imgSrc = (v: string) => (v?.startsWith("http") ? v : getImagePath(v || ""));

  const renderTabs = () => (
    <div>
      <div className="flex flex-wrap justify-center mb-12 border-b">
        {modules.map((module: any, index: number) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === index ? "text-white rounded-t-lg" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={activeTab === index ? { backgroundColor: colors.primary, borderColor: colors.primary } : {}}
          >
            {module.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">{modules[activeTab]?.title}</h3>
          <div className="text-gray-600 text-lg">{modules[activeTab]?.description}</div>
        </div>
        <div className="bg-gray-100 rounded-lg h-80 flex items-center justify-center overflow-hidden">
          {modules[activeTab]?.image ? (
            <img src={imgSrc(modules[activeTab].image)} alt={modules[activeTab].title} className="w-full h-full object-cover" />
          ) : (
            <Monitor className="h-16 w-16 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {modules.map((module: any, index: number) => (
        <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="h-48 bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
            {module.image ? (
              <img src={imgSrc(module.image)} alt={module.title} className="w-full h-full object-cover" />
            ) : (
              <Monitor className="h-12 w-12 text-gray-400" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-3">{module.title}</h3>
          <div className="text-slate-700">{module.description}</div>
        </div>
      ))}
    </div>
  );

  const renderAccordion = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {modules.map((module: any, index: number) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <button
            onClick={() => setOpenAccordion(openAccordion === index ? -1 : index)}
            className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            style={{ backgroundColor: openAccordion === index ? `${colors.primary}08` : "transparent" }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colors.primary}15` }}>
                <Monitor className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg">{module.label}</span>
                <p className="text-sm text-gray-500 mt-1">{module.description?.substring(0, 60)}...</p>
              </div>
            </div>
            <ChevronDown
              className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${openAccordion === index ? "rotate-180" : ""}`}
              style={{ color: openAccordion === index ? colors.primary : undefined }}
            />
          </button>
          {openAccordion === index && (
            <div className="px-8 pb-8 bg-gray-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">{module.title}</h3>
                  <div className="text-slate-700 leading-relaxed">{module.description}</div>
                </div>
                <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                  {module.image ? (
                    <img src={imgSrc(module.image)} alt={module.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Module Preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSlider = () => (
    <div className="relative">
      <div className="overflow-hidden rounded-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-gray-800 p-12 rounded-xl">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">{modules[currentSlide]?.title}</h3>
            <div className="text-gray-300 text-lg mb-6">{modules[currentSlide]?.description}</div>
            <div className="flex space-x-2">
              {modules.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${currentSlide === index ? "bg-white" : "bg-gray-600"}`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="h-80 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
            {modules[currentSlide]?.image ? (
              <img src={imgSrc(modules[currentSlide].image)} alt={modules[currentSlide].title} className="w-full h-full object-cover" />
            ) : (
              <Monitor className="h-16 w-16 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {modules.map((module: any, index: number) => (
        <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 group relative overflow-hidden">
          <div className="p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0 relative">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {module.image ? (
                    <img
                      src={imgSrc(module.image)}
                      alt={module.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <Monitor className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: colors.primary }}>
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-gray-700 transition-colors">{module.title}</h3>
                <div className="text-slate-700 leading-relaxed mb-4">{module.description}</div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}>
                  {module.label}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300" style={{ backgroundColor: colors.primary }} />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (config.layout) {
      case "cards":
        return renderCards();
      case "accordion":
        return renderAccordion();
      case "slider":
        return renderSlider();
      case "grid":
        return renderGrid();
      default:
        return renderTabs();
    }
  };

  return (
    <section className={config.section}>
      <div className={config.container}>
        <h2 className={config.title}>{title}</h2>
        <p className={config.subtitle}>{subtitle}</p>
        {renderContent()}
      </div>
    </section>
  );
}

