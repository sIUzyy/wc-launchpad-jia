"use client";

import { useEffect, useRef, useState } from "react";
import InterviewQuestionGeneratorV2 from "./InterviewQuestionGeneratorV2";
import RichTextEditor from "@/lib/components/CareerComponents/RichTextEditor";
import CustomDropdown from "@/lib/components/CareerComponents/CustomDropdown";
import philippineCitiesAndProvinces from "../../../../public/philippines-locations.json";
import { guid, interviewQuestionCategoryMap ,candidateActionToast, errorToast } from "@/lib/Utils";
import { useAppContext } from "@/lib/context/AppContext";
import axios from "axios";
import CareerActionModal from "./CareerActionModal";
import FullScreenLoadingAnimation from "./FullScreenLoadingAnimation";
import { assetConstants } from "@/lib/utils/constantsV2";
import stepperStyles from "@/lib/styles/components/careerFormStepper.module.scss";
// Setting List icons
const screeningSettingList = [
  {
    name: "Good Fit and above",
    icon: "la la-check",
  },
  {
    name: "Only Strong Fit",
    icon: "la la-check-double",
  },
  {
    name: "No Automatic Promotion",
    icon: "la la-times",
  },
];
const workSetupOptions = [
  {
    name: "Fully Remote",
  },
  {
    name: "Onsite",
  },
  {
    name: "Hybrid",
  },
];

const employmentTypeOptions = [
  {
    name: "Full-Time",
  },
  {
    name: "Part-Time",
  },
];

export default function CareerForm({
  career,
  formType,
  setShowEditModal,
}: {
  career?: any;
  formType: string;
  setShowEditModal?: (show: boolean) => void;
}) {
  const { user, orgID } = useAppContext();
  const [jobTitle, setJobTitle] = useState(career?.jobTitle || "");
  const [description, setDescription] = useState(career?.description || "");
  const [workSetup, setWorkSetup] = useState(career?.workSetup || "");
  const [workSetupRemarks, setWorkSetupRemarks] = useState(
    career?.workSetupRemarks || ""
  );
  const [screeningSetting, setScreeningSetting] = useState(
    career?.screeningSetting || "Good Fit and above"
  );
  const [employmentType, setEmploymentType] = useState(
    career?.employmentType || ""
  );
  const [requireVideo, setRequireVideo] = useState(
    career?.requireVideo || true
  );
  const [salaryNegotiable, setSalaryNegotiable] = useState(
    career?.salaryNegotiable || true
  );
  const [minimumSalary, setMinimumSalary] = useState(
    career?.minimumSalary || ""
  );
  const [maximumSalary, setMaximumSalary] = useState(
    career?.maximumSalary || ""
  );
  const [questions, setQuestions] = useState(
    career?.questions || [
      {
        id: 1,
        category: "CV Validation / Experience",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 2,
        category: "Technical",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 3,
        category: "Behavioral",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 4,
        category: "Analytical",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 5,
        category: "Others",
        questionCountToAsk: null,
        questions: [],
      },
    ]
  );
  const [country, setCountry] = useState(career?.country || "Philippines");
  const [province, setProvince] = useState(career?.province || "");
  const [city, setCity] = useState(career?.location || "");
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState("");
  const [isSavingCareer, setIsSavingCareer] = useState(false);
  const savingCareerRef = useRef(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ member: any; role: string }>
    >([]);
  
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<{
    [key: string]: boolean;
  }>({});
  const [questionTypeDropdownOpen, setQuestionTypeDropdownOpen] = useState<{
    [key: string]: boolean;
  }>({});
  const [cvSecretPrompt, setCvSecretPrompt] = useState(
    career?.cvSecretPrompt || ""
  );
  const [step1Errors, setStep1Errors] = useState<{
    jobTitle?: boolean;
    employmentType?: boolean;
    workSetup?: boolean;
    province?: boolean;
    city?: boolean;
    minimumSalary?: boolean;
    maximumSalary?: boolean;
    description?: boolean;
  }>({});
  const [savedCareerId, setSavedCareerId] = useState<string | null>(
    career?._id || null
  );
  const [preScreeningQuestions, setPreScreeningQuestions] = useState<
    Array<{
      id: string;
      question: string;
      type:
        | "dropdown"
        | "range"
        | "short-answer"
        | "long-answer"
        | "checkboxes";
      options?: string[];
      min?: number;
      max?: number;
      currency?: string;
    }>
  >(
    career?.preScreeningQuestions?.map((q: any, index: number) => {
      if (typeof q === "string") {
        // Legacy format - convert to new format
        return {
          id: `q-${index}`,
          question: q,
          type: "short-answer" as const,
        };
      }
      return q;
    }) || []
  );

  const [currentStep, setCurrentStep] = useState(career?.lastStep || 1);
  const [aiSecretPrompt, setAiSecretPrompt] = useState(
    career?.aiSecretPrompt || ""
  );
  const steps = [
    { id: 1, label: "Career Details & Team Access" },
    { id: 2, label: "CV Review & Pre-screening" },
    { id: 3, label: "AI Interview Setup" },
    { id: 4, label: "Review Career" },
  ];

  function processState(index: number, isAdvance: boolean = false) {
    const currentIndex = (currentStep || 1) - 1; // currentStep is 1-based
    if (index < currentIndex) return "Completed";
    if (index === currentIndex) return "In Progress";
    return "Pending";
  }
  const suggestedPreScreeningQuestions = [
    {
      title: "Notice Period",
      subtitle: "How long is your notice period?",
      key: "Notice Period",
      type: "dropdown" as const,
      options: ["Immediately", "< 30 days", "> 30 days"],
    },
    {
      title: "Work Setup",
      subtitle: "How often are you willing to report to the office each week?",
      key: "Work Setup",
      type: "dropdown" as const,
      options: [
        "At most 1-2x a week",
        "At most 3-4x a week",
        "Open to fully onsite work",
        "Only open to fully remote work",
      ],
    },
    {
      title: "Asking Salary",
      subtitle: "How much is your expected monthly salary?",
      key: "Asking Salary",
      type: "range" as const,
    },
  ];

  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const questionCount = 5;

  const generateAllQuestions = async () => {
  try {
    if (!jobTitle.trim() || !description.trim()) {
      errorToast("Please fill in all fields", 1500);
      return;
    }
    setIsGeneratingQuestions(true);

    const interviewCategories = Object.keys(interviewQuestionCategoryMap);
    const response = await axios.post("/api/llm-engine", {
      systemPrompt: "You are a helpful assistant that can answer questions and help with tasks.",
      prompt: `Generate ${questionCount * interviewCategories.length} interview questions for the following Job opening:
      Job Title:
      ${jobTitle}
      Job Description:
      ${description}

      ${interviewCategories.map(category => `Category:
        ${category}
        Category Description:
        ${interviewQuestionCategoryMap[category].description}`).join("\n")}

      ${interviewCategories.map(category => `${questionCount} questions for ${category}`).join(", ")}

      ${
        questions.reduce((acc, group) => acc + group.questions.length, 0) > 0
          ? `Do not generate questions that are already covered in this list:\n${questions
              .map(group => group.questions.map((question, index) => `          ${index + 1}. ${question.question}`).join("\n"))
              .join("\n")}`
          : ""
      }

      return it in json format following this for each element {category: "category", questions: ["question1", "question2", "question3", "question4", "question5"]}
      return only the json array, nothing else, now markdown format just pure json code.
      `,
    });

    let finalGeneratedQuestions = response.data.result;
    finalGeneratedQuestions = finalGeneratedQuestions.replace("```json", "").replace("```", "");
    finalGeneratedQuestions = JSON.parse(finalGeneratedQuestions);

    const newArray = [...questions];
    finalGeneratedQuestions.forEach((questionGroup: { category: string; questions: string[] }) => {
      const categoryIndex = newArray.findIndex(q => q.category === questionGroup.category);
      if (categoryIndex !== -1) {
        const newQuestions = questionGroup.questions.map(q => ({ id: guid(), question: q }));
        newArray[categoryIndex].questions = [...newArray[categoryIndex].questions, ...newQuestions];
      }
    });

    setQuestions(newArray);

    candidateActionToast(
      <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27", marginLeft: 8 }}>
        Questions generated successfully
      </span>,
      1500,
      <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>
    );
  } catch (err) {
    console.log(err);
    errorToast("Error generating questions, please try again", 1500);
  } finally {
    setIsGeneratingQuestions(false);
  }
};

  const questionTypes = [
    { name: "Short Answer", value: "short-answer", icon: "las la-user" },
    { name: "Long Answer", value: "long-answer", icon: "las la-align-left" },
    { name: "Dropdown", value: "dropdown", icon: "las la-list" },
    { name: "Checkboxes", value: "checkboxes", icon: "las la-check-square" },
    { name: "Range", value: "range", icon: "las la-sliders-h" },
  ];

  const roleOptions = [
    {
      name: "Job Owner",
      description:
        "Leads the hiring process for assigned jobs. Has access with all career settings.",
    },
    {
      name: "Contributor",
      description:
        "Helps evaluate candidates and assist with hiring tasks. Can move candidates through the pipeline, but cannot change any career settings.",
    },
    {
      name: "Reviewer",
      description:
        "Reviews candidates and provides feedback. Can only view candidate profiles and comment.",
    },
  ];

  // Fetch available members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!orgID) return;
      try {
        const response = await axios.post("/api/fetch-members", { orgID });
        // Filter out current user from available members
        const filtered = response.data.filter(
          (m: any) => m.email !== user?.email
        );
        setAvailableMembers(filtered);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      }
    };
    fetchMembers();
  }, [orgID, user?.email]);

  // Filter members based on search
  const filteredMembers = availableMembers.filter((member) => {
    if (!memberSearch) return true;
    const searchLower = memberSearch.toLowerCase();
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("[data-member-dropdown]") &&
        !target.closest("[data-role-dropdown]") &&
        !target.closest("[data-question-type-dropdown]")
      ) {
        setMemberDropdownOpen(false);
        setRoleDropdownOpen({});
        setQuestionTypeDropdownOpen({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isFormValid = () => {
    // Base validation for required fields
    const baseValidation =
      jobTitle?.trim().length > 0 &&
      description?.trim().length > 0 &&
      workSetup?.trim().length > 0;

    // Specific validation per step
    switch (currentStep) {
      case 1:
        return baseValidation;
      case 2:
        // CV Review & Pre-screening step - everything is optional
        return true;
      case 3:
        // AI Interview Setup - require at least one question
        return baseValidation && questions.some((q) => q.questions.length > 0);
      case 4:
        return baseValidation;
      default:
        return false;
    }
  };

  const validateStep1 = () => {
    const errors: typeof step1Errors = {};

    if (!jobTitle?.trim()) {
      errors.jobTitle = true;
    }
    if (!employmentType?.trim()) {
      errors.employmentType = true;
    }
    if (!workSetup?.trim()) {
      errors.workSetup = true;
    }
    if (!province?.trim()) {
      errors.province = true;
    }
    if (!city?.trim()) {
      errors.city = true;
    }
    if (!salaryNegotiable) {
      if (!minimumSalary || Number(minimumSalary) === 0) {
        errors.minimumSalary = true;
      }
      if (!maximumSalary || Number(maximumSalary) === 0) {
        errors.maximumSalary = true;
      }
    }
    if (!description?.trim()) {
      errors.description = true;
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveDraft = async () => {
    if (
      Number(minimumSalary) &&
      Number(maximumSalary) &&
      Number(minimumSalary) > Number(maximumSalary)
    ) {
      errorToast("Minimum salary cannot be greater than maximum salary", 1300);
      return;
    }

    let userInfoSlice = {
      image: user.image,
      name: user.name,
      email: user.email,
    };

    const careerData = {
      ...(savedCareerId && { _id: savedCareerId }),
      jobTitle,
      description,
      workSetup,
      workSetupRemarks,
      questions,
      lastEditedBy: userInfoSlice,
      ...(formType === "add" && { createdBy: userInfoSlice }),
      status: "inactive",
      updatedAt: Date.now(),
      screeningSetting,
      cvSecretPrompt,
      preScreeningQuestions,
      aiSecretPrompt,
      requireVideo,
      salaryNegotiable,
      minimumSalary: isNaN(Number(minimumSalary))
        ? null
        : Number(minimumSalary),
      maximumSalary: isNaN(Number(maximumSalary))
        ? null
        : Number(maximumSalary),
      country,
      province,
      location: city,
      employmentType,
      orgID,
      lastStep: currentStep, 
    };

    try {
      setIsSavingCareer(true);
      let response;
      if (savedCareerId) {
        // Update existing draft
        response = await axios.post("/api/update-career", careerData);
      } else {
        // Create new draft
        response = await axios.post("/api/add-career", careerData);
        if (response.data?.career?._id) {
          setSavedCareerId(response.data.career._id);
        }
      }

      if (response.status === 200) {
        candidateActionToast(
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginLeft: 8,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>
              Progress saved
            </span>
          </div>,
          1300,
          <i
            className="la la-check-circle"
            style={{ color: "#039855", fontSize: 32 }}
          ></i>
        );
      }
    } catch (error) {
      console.error(error);
      errorToast("Failed to save progress", 1300);
    } finally {
      setIsSavingCareer(false);
    }
  };

  const updateCareer = async (status: string) => {
    if (
      Number(minimumSalary) &&
      Number(maximumSalary) &&
      Number(minimumSalary) > Number(maximumSalary)
    ) {
      errorToast("Minimum salary cannot be greater than maximum salary", 1300);
      return;
    }
    let userInfoSlice = {
      image: user.image,
      name: user.name,
      email: user.email,
    };
    const updatedCareer = {
      _id: career._id,
      jobTitle,
      description,
      workSetup,
      workSetupRemarks,
      questions,
      lastEditedBy: userInfoSlice,
      status,
      updatedAt: Date.now(),
      screeningSetting,
      cvSecretPrompt,
      preScreeningQuestions,
      aiSecretPrompt,
      requireVideo,
      salaryNegotiable,
      minimumSalary: isNaN(Number(minimumSalary))
        ? null
        : Number(minimumSalary),
      maximumSalary: isNaN(Number(maximumSalary))
        ? null
        : Number(maximumSalary),
      country,
      province,
      // Backwards compatibility
      location: city,
      employmentType,
       lastStep: currentStep,
    };
    try {
      setIsSavingCareer(true);
      const response = await axios.post("/api/update-career", updatedCareer);
      if (response.status === 200) {
        candidateActionToast(
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginLeft: 8,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>
              Career updated
            </span>
          </div>,
          1300,
          <i
            className="la la-check-circle"
            style={{ color: "#039855", fontSize: 32 }}
          ></i>
        );
        setTimeout(() => {
          window.location.href = `/recruiter-dashboard/careers/manage/${career._id}`;
        }, 1300);
      }
    } catch (error) {
      console.error(error);
      errorToast("Failed to update career", 1300);
    } finally {
      setIsSavingCareer(false);
    }
  };

const handleSaveAndContinue = async () => {
  if (currentStep === 1) {
    if (!validateStep1()) {
      errorToast("Please fill in all required fields", 1300);
      return;
    }
    await saveDraft();
    setCurrentStep(2);
    return;
  }

  // If on last step, publish immediately
  if (currentStep === 4) {
    if (formType === "add") {
      confirmSaveCareer("active");
    } else {
      updateCareer("active");
    }
    return;
  }

  if (currentStep < 4) {
    setCurrentStep(currentStep + 1);
    return;
  }
};

  const confirmSaveCareer = (status: string) => {
    if (
      Number(minimumSalary) &&
      Number(maximumSalary) &&
      Number(minimumSalary) > Number(maximumSalary)
    ) {
      errorToast("Minimum salary cannot be greater than maximum salary", 1300);
      return;
    }

    setShowSaveModal(status);
  };

  const saveCareer = async (status: string) => {
  setShowSaveModal("");
  if (!status) {
    return;
  }

  if (!savingCareerRef.current) {
    setIsSavingCareer(true);
    savingCareerRef.current = true;

    const userInfoSlice = {
      image: user.image,
      name: user.name,
      email: user.email,
    };

    const payload = {
      ...(savedCareerId && { _id: savedCareerId }),
      jobTitle,
      description,
      workSetup,
      workSetupRemarks,
      questions,
      lastEditedBy: userInfoSlice,
      createdBy: userInfoSlice,
      screeningSetting,
      cvSecretPrompt,
      preScreeningQuestions,
      aiSecretPrompt,
      orgID,
      requireVideo,
      salaryNegotiable,
      minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
      maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
      country,
      province,
      // Backwards compatibility
      location: city,
      status,
      employmentType,
      lastStep: currentStep,
    };

    try {
      const url = savedCareerId ? "/api/update-career" : "/api/add-career";
      const response = await axios.post(url, payload);

      if (!savedCareerId && response.data?.career?._id) {
        setSavedCareerId(response.data.career._id);
      }

      candidateActionToast(
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginLeft: 8,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>
            {savedCareerId
              ? status === "active"
                ? "Career updated and published"
                : "Career updated"
              : `Career added ${status === "active" ? "and published" : ""}`}
          </span>
        </div>,
        1300,
        <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>
      );

      setTimeout(() => {
        window.location.href = `/recruiter-dashboard/careers`;
      }, 1300);
    } catch (error) {
      errorToast(savedCareerId ? "Failed to update career" : "Failed to add career", 1300);
    } finally {
      savingCareerRef.current = false;
      setIsSavingCareer(false);
    }
  }
  };
  


  useEffect(() => {
    const parseProvinces = () => {
      setProvinceList(philippineCitiesAndProvinces.provinces);

      const defaultProvince = philippineCitiesAndProvinces.provinces[0];

      const cities = philippineCitiesAndProvinces.cities.filter(
        (city) => city.province === defaultProvince.key
      );
      setCityList(cities);
    };

    parseProvinces();
  }, [career]);

  return (
    <div className="col">
      {formType === "add" ? (
        <div
          style={{
            marginBottom: "35px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: 550, color: "#111827" }}>
            {jobTitle && currentStep > 1 ? (
              <>
                <span style={{ color: "#717680", fontWeight: 700 }}>
                  [Draft]{" "}
                </span>
                {jobTitle}
              </>
            ) : (
              "Add new career"
            )}
          </h1>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "10px",
            }}
          >
         {/* save as unpublished */}
            <button
              disabled={!isFormValid?.() && currentStep !== 1 || isSavingCareer}
              style={{
                width: "fit-content",
                color: "#414651",
                background: "#fff",
                border: "1px solid #D5D7DA",
                padding: "8px 16px",
                borderRadius: "60px",
                cursor:
                  (!isFormValid?.() && currentStep !== 1) || isSavingCareer
                    ? "not-allowed"
                    : "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() =>
                currentStep === 1 ? saveDraft() : confirmSaveCareer("inactive")
              }
            >
              Save as Unpublished
            </button>
            
            {/* save and continue / publish */}
              <button
                disabled={!isFormValid?.() && currentStep !== 1 || isSavingCareer}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "fit-content",
                  background:
                    (!isFormValid?.() && currentStep !== 1) || isSavingCareer
                      ? "#D5D7DA"
                      : "black",
                  color: "#fff",
                  border: "1px solid #E9EAEB",
                  padding: "8px 16px",
                  borderRadius: "60px",
                  cursor:
                    (!isFormValid?.() && currentStep !== 1) || isSavingCareer
                      ? "not-allowed"
                      : "pointer",
                  whiteSpace: "nowrap",
                }}
                onClick={handleSaveAndContinue}
              >
                {currentStep === 4 ? (
                  <>
                    <i
                      className="la la-check-circle"
                      style={{ color: "#fff", fontSize: 20 }}
                    ></i>
                    Publish
                  </>
                ) : (
                  <>
                    Save and Continue
                    <i
                      className="las la-arrow-right"
                      style={{ color: "#fff", fontSize: 20 }}
                    ></i>
                  </>
                )}
              </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginBottom: "35px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: 550, color: "#111827" }}>
            Edit Career Details
          </h1>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <button
              style={{
                width: "fit-content",
                color: "#414651",
                background: "#fff",
                border: "1px solid #D5D7DA",
                padding: "8px 16px",
                borderRadius: "60px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                setShowEditModal?.(false);
              }}
            >
              Cancel
            </button>
            <button
              disabled={!isFormValid() || isSavingCareer}
              style={{
                width: "fit-content",
                color: "#414651",
                background: "#fff",
                border: "1px solid #D5D7DA",
                padding: "8px 16px",
                borderRadius: "60px",
                cursor:
                  !isFormValid() || isSavingCareer ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                updateCareer("inactive");
              }}
            >
              Save Changes as Unpublished
            </button>
            <button
              disabled={!isFormValid() || isSavingCareer}
              style={{
                width: "fit-content",
                background:
                  !isFormValid() || isSavingCareer ? "#D5D7DA" : "black",
                color: "#fff",
                border: "1px solid #E9EAEB",
                padding: "8px 16px",
                borderRadius: "60px",
                cursor:
                  !isFormValid() || isSavingCareer ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={handleSaveAndContinue}
            >
              <i
                className="la la-check-circle"
                style={{ color: "#fff", fontSize: 20, marginRight: 8 }}
              ></i>
              Save Changes and Continue
            </button>
          </div>
        </div>
      )}


        {/* stepper (progress-bar) */}
          <div
            className={stepperStyles.stepContainer}
            style={{
              borderBottom: "1px solid #EAECF5", 
              paddingBottom: "25px"
            }}
          >
            <div className={stepperStyles.step}>
              {steps.map((_, index) => (
                <div className={stepperStyles.stepBar} key={index}>
                  <img
                    alt=""
                    src={
                      assetConstants[
                        processState(index, true).toLowerCase().replace(" ", "_")
                      ]
                    }
                  />
                  {index < steps.length - 1 && (
                    <hr
                      className={
                        stepperStyles[
                          processState(index).toLowerCase().replace(" ", "_")
                        ]
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className={stepperStyles.step}>
              {steps.map((item, index) => (
                <span
                  className={`${stepperStyles.stepDetails} ${
                    stepperStyles[
                      processState(index, true).toLowerCase().replace(" ", "_")
                    ]
                  }`}
                  key={index}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          {/* end of stepper */}
      
       {/* parent of left and right columns */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          width: "100%",
          maxWidth: 1280,
          gap: 20,
          alignItems: "flex-start",
          margin: "16px auto 0",
        }}
      >
        {/* left column */}
        <div
          style={{
            width: "100%",
            flex: "0 1 66.6667%",
            maxWidth: 840,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* step 1: career details & team access */}
          {currentStep === 1 && (
            <>
              {/* 1. career-information section*/}
                <div className="layered-card-middle">
                  <span className="career-form-title">1. Career Information</span>
                  <div className="layered-card-content">

                    {/* basic-information section*/}
                    <div className="career-form-section">
                      <span className="career-form-label">
                        Basic Information
                      </span>

                      {/* job title - label */}
                      <span className="career-form-input-label">
                        Job Title
                      </span>

                      {/* job title - input */}
                      <div style={{ position: "relative" }}>
                        <input
                          value={jobTitle}
                          className="form-control"
                          placeholder="Enter job title"
                          onChange={(e) => {
                            setJobTitle(e.target.value || "");
                            if (step1Errors.jobTitle && e.target.value.trim()) {
                              setStep1Errors({
                                ...step1Errors,
                                jobTitle: false,
                              });
                            }
                          }}
                          style={{
                            border: step1Errors.jobTitle ? "1px solid #DC2626" : undefined,
                          }}
                        ></input>
                        {step1Errors.jobTitle && (
                          <i
                            className="la la-exclamation-circle career-form-error-icon"
                            style={{ right: "12px"}}
                          ></i>
                        )}
                      </div>

                      {/* job title - error */}
                      {step1Errors.jobTitle && (
                        <span className="career-form-input-error">
                          This is a required field.
                        </span>
                      )}
                    </div>
                    {/* end of basic-information section*/}

                    {/* work-setting section*/}
                    <div className="career-form-section">
                      {/* work-setting section*/}
                      <span className="career-form-label">
                        Work Setting
                      </span>

                      {/* employment type & arrangement */}
                      <div className="career-form-row">
                        {/* employment type */}
                        <div style={{ width: "50%" }}>
                           <span className="career-form-input-label">
                            Employment Type
                          </span>
                          {/* employment type - dropdown */}
                          <CustomDropdown
                            onSelectSetting={(employmentType) => {
                              setEmploymentType(employmentType);
                              if (
                                step1Errors.employmentType &&
                                employmentType
                              ) {
                                setStep1Errors({
                                  ...step1Errors,
                                  employmentType: false,
                                });
                              }
                            }}
                            screeningSetting={employmentType}
                            settingList={employmentTypeOptions}
                            placeholder="Choose employment type"
                          />
                          {/* employment type - error */}
                          {step1Errors.employmentType && (
                           <span className="career-form-input-error">
                              This is a required field.
                            </span>
                          )}
                        </div>
                        {/* arrangement */}
                        <div style={{ width: "50%" }}>
                          {/* arrangement - label */}
                         <span className="career-form-input-label">
                            Arrangement
                          </span>
                          {/* arrangement - dropdown */}
                          <CustomDropdown
                            onSelectSetting={(setting) => {
                              setWorkSetup(setting);
                              if (step1Errors.workSetup && setting) {
                                setStep1Errors({
                                  ...step1Errors,
                                  workSetup: false,
                                });
                              }
                            }}
                            screeningSetting={workSetup}
                            settingList={workSetupOptions}
                            placeholder="Choose work arrangement "
                          />
                          {/* arrangement - error */}
                          {step1Errors.workSetup && (
                           <span className="career-form-input-error">
                              This is a required field.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* end of work-setting section*/}

                    {/* location section*/}
                    <div className="career-form-section">
                      {/* location section*/}
                     <span className="career-form-label">
                        Location
                      </span>

                      {/* country & state / province & city */}
                     <div className="career-form-row">
                        {/* country */}
                        <div style={{ width: "100%" }}>
                          {/* country - label */}
                          <span className="career-form-input-label">
                            Country
                          </span>
                          {/* country - dropdown */}
                          <CustomDropdown
                            onSelectSetting={(setting) => {
                              setCountry(setting);
                            }}
                            screeningSetting={country}
                            settingList={[]}
                            placeholder="Select Country"
                          />
                        </div>
                        {/* state / province */}
                        <div style={{ width: "100%" }}>

                          {/* state / province - label */}
                         <span className="career-form-input-label">
                            State / Province
                          </span>
                          {/* state / province - dropdown */}
                          <CustomDropdown
                            onSelectSetting={(province) => {
                              setProvince(province);
                              if (step1Errors.province && province) {
                                setStep1Errors({
                                  ...step1Errors,
                                  province: false,
                                });
                              }
                              const provinceObj = provinceList.find(
                                (p) => p.name === province
                              );
                              if (provinceObj) {
                                const cities =
                                  philippineCitiesAndProvinces.cities.filter(
                                    (city) => city.province === provinceObj.key
                                  );
                                setCityList(cities);
                                if (cities.length > 0) {
                                  setCity(cities[0].name);
                                  if (step1Errors.city) {
                                    setStep1Errors({
                                      ...step1Errors,
                                      city: false,
                                    });
                                  }
                                }
                              }
                            }}
                            screeningSetting={province}
                            settingList={provinceList}
                            placeholder="Choose state / province"
                          />
                          {/* state / province - error */}
                          {step1Errors.province && (
                           <span className="career-form-input-error">
                              This is a required field.
                            </span>
                          )}
                        </div>
                        {/* city */}
                        <div style={{ width: "100%" }}>
                          {/* city - label */}
                          <span className="career-form-input-label">
                            City
                          </span>
                          {/* city - dropdown */}
                          <CustomDropdown
                            onSelectSetting={(city) => {
                              setCity(city);
                              if (step1Errors.city && city) {
                                setStep1Errors({ ...step1Errors, city: false });
                              }
                            }}
                            screeningSetting={city}
                            settingList={cityList}
                            placeholder="Choose city"
                          />
                          {/* city - error */}
                          {step1Errors.city && (
                           <span className="career-form-input-error">
                              This is a required field.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* salary section*/}
                    <div className="career-form-section">
                      {/* salary section*/}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        {/* salary section - label*/}
                         <span className="career-form-label">
                          Salary
                        </span>

                        {/* salary section - toggle */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: 5,
                            alignItems: "flex-start",
                            minWidth: "122px",
                          }}
                        >
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={salaryNegotiable}
                              onChange={() => {
                                setSalaryNegotiable(!salaryNegotiable);
                                
                                if (!salaryNegotiable) {
                                  setStep1Errors({
                                    ...step1Errors,
                                    minimumSalary: false,
                                    maximumSalary: false,
                                  });
                                }
                              }}
                            />
                            <span className="slider round"></span>
                          </label>
                          <span
                            style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#414651",
                          }}
                          >
                            {salaryNegotiable ? "Negotiable" : "Fixed"}
                          </span>
                        </div>
                      </div>

                      {/* minimum salary & maximum salary */}
                      <div className="career-form-row">
                        {/* minimum salary */}
                        <div style={{ flex: 1 }}>
                          {/* minimum salary - label */}
                          <span className="career-form-input-label">
                            Minimum Salary
                          </span>
                          {/* minimum salary - input */}
                          <div style={{ position: "relative" }}>
                          <span className="career-form-salary-span">₱</span>
                            <input
                              type="number"
                              className="form-control"
                              style={{
                                paddingLeft: "28px",
                                paddingRight: step1Errors.minimumSalary
                                  ? "40px"
                                  : "28px",
                                borderColor: step1Errors.minimumSalary
                                  ? "#DC2626"
                                  : undefined,
                              }}
                              placeholder="0"
                              min={0}
                              value={minimumSalary}
                              onChange={(e) => {
                                setMinimumSalary(e.target.value || "");
                                if (
                                  step1Errors.minimumSalary &&
                                  e.target.value &&
                                  Number(e.target.value) > 0
                                ) {
                                  setStep1Errors({
                                    ...step1Errors,
                                    minimumSalary: false,
                                  });
                                }
                              }}
                            />
                            {/* minimum salary - error */}
                            {step1Errors.minimumSalary && (
                              <i className="la la-exclamation-circle career-form-error-icon"></i>
                            )}
                          <span className="career-form-salary-currency">PHP</span>
                          </div>
                          {/* minimum salary - error */}
                          {step1Errors.minimumSalary && (
                           <span className="career-form-input-error">
                              This is a required field.
                            </span>
                          )}
                        </div>

                        {/* maximum salary */}
                        <div style={{ flex: 1 }}>
                          {/* maximum salary - label */}
                          <span className="career-form-input-label">
                            Maximum Salary
                          </span>
                          {/* maximum salary - input */}
                          <div style={{ position: "relative" }}>
                           <span className="career-form-salary-span">₱</span>
                            <input
                              type="number"
                              className="form-control"
                              style={{
                                paddingLeft: "28px",
                                paddingRight: step1Errors.maximumSalary
                                  ? "40px"
                                  : "28px",
                                borderColor: step1Errors.maximumSalary
                                  ? "#DC2626"
                                  : undefined,
                              }}
                              placeholder="0"
                              min={0}
                              value={maximumSalary}
                              onChange={(e) => {
                                setMaximumSalary(e.target.value || "");
                                if (
                                  step1Errors.maximumSalary &&
                                  e.target.value &&
                                  Number(e.target.value) > 0
                                ) {
                                  setStep1Errors({
                                    ...step1Errors,
                                    maximumSalary: false,
                                  });
                                }
                              }}
                            ></input>
                            {/* maximum salary - error */}
                            {step1Errors.maximumSalary && (
                              <i className="la la-exclamation-circle career-form-error-icon"></i>
                            )}
                            <span className="career-form-salary-currency">PHP</span>
                          </div>
                          {/* maximum salary - error */}
                          {step1Errors.maximumSalary && (
                           <span className="career-form-input-error">This is a required field.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* 2. job-description section*/}
              <div className="layered-card-middle">
                <span className="career-form-title">2. Job Description</span>
                <div className="layered-card-content">
                  <RichTextEditor
                    setText={(text) => {
                      setDescription(text);
                      if (step1Errors.description && text?.trim()) {
                        setStep1Errors({ ...step1Errors, description: false });
                      }
                    }}
                    text={description}
                    placeholder="Enter job description..."
                    
                  />
                  {step1Errors.description && (
                    <span className="career-form-input-error">This is a required field.</span>
                  )}
                </div>
              </div>

              {/* 3. team-access section*/}
              <div style={{marginBottom: "20px"}} className="layered-card-middle">
                <span className="career-form-title">3. Team Access</span>
                <div className="layered-card-content">
                  <div className="career-form-section" style={{gap: 12, marginBottom: 0}}>
                   

                    {/* parent of team access title and description & member dropdown */}
                    <div
                      className="career-form-row" 
                      style={{gap: 0, justifyContent: "space-between", borderBottom: "1px solid #E9EAEB", paddingBottom: "12px"}}
                    >

                      {/* team access title and description */}
                      <div>
                        <span className="career-form-label" style={{display: "block"}}>
                        Add more members
                        </span>
                        
                        <span className="career-form-label-description">
                        You can add other members to collaborate on this career.
                      </span>
                      </div>
                     
                      {/* add member dropdown */}
                      <div
                        style={{ width: 240, position: "relative" }}
                        data-member-dropdown
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMemberDropdownOpen(!memberDropdownOpen)
                          }
                          className="career-form-member-button"
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <i
                              className="las la-user"
                              style={{ fontSize: 16, color: "#717680" }}
                            ></i>
                            <span
                              style={{
                                color: selectedTeamMember
                                  ? "#181D27"
                                  : "#717680",
                                fontSize: 14,
                              }}
                            >
                              {selectedTeamMember
                                ? selectedTeamMember.name
                                : "Add member"}
                            </span>
                          </div>
                          <i
                            className="la la-angle-down"
                            style={{ fontSize: 12, color: "#181D27" }}
                          ></i>
                        </button>
                        {memberDropdownOpen && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              marginTop: 4,
                              background: "#fff",
                              border: "1px solid #E9EAEB",
                              borderRadius: 8,
                              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                              zIndex: 1000,
                              maxHeight: 300,
                              overflowY: "auto",
                            }}
                          >
                            {/* search input */}
                            <div
                              style={{
                                padding: 12,
                                borderBottom: "1px solid #E9EAEB",
                              }}
                            >
                              <div
                                style={{
                                  position: "relative",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="las la-search"
                                  style={{
                                    position: "absolute",
                                    left: 12,
                                    fontSize: 16,
                                    color: "#717680",
                                  }}
                                ></i>
                                <input
                                  type="text"
                                  placeholder="Search member"
                                  value={memberSearch}
                                  onChange={(e) =>
                                    setMemberSearch(e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px 8px 36px",
                                    border: "1px solid #E9EAEB",
                                    borderRadius: 6,
                                    fontSize: 14,
                                  }}
                                />
                              </div>
                            </div>
                            {/* member list */}
                            <div style={{ padding: 4 }}>
                              {filteredMembers.length === 0 ? (
                                <div
                                  style={{
                                    padding: 16,
                                    textAlign: "center",
                                    color: "#717680",
                                    fontSize: 14,
                                  }}
                                >
                                  No members found
                                </div>
                              ) : (
                                filteredMembers.map((member) => {
                                  const isAlreadyAdded = teamMembers.some(
                                    (tm) => tm.member.email === member.email
                                  );
                                  return (
                                    <div
                                      key={member._id || member.email}
                                      onClick={() => {
                                        if (!isAlreadyAdded) {
                                          setSelectedTeamMember(member);
                                          setTeamMembers([
                                            ...teamMembers,
                                            { member, role: "Contributor" },
                                          ]);
                                          setMemberDropdownOpen(false);
                                          setMemberSearch("");
                                        }
                                      }}
                                      style={{
                                        padding: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        cursor: isAlreadyAdded
                                          ? "not-allowed"
                                          : "pointer",
                                        opacity: isAlreadyAdded ? 0.5 : 1,
                                        borderRadius: 6,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: "50%",
                                          backgroundColor: "#E9EAEB",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          overflow: "hidden",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {member.image ? (
                                          <img
                                            src={member.image}
                                            alt={member.name}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                          />
                                        ) : (
                                          <i
                                            className="las la-user"
                                            style={{
                                              fontSize: 16,
                                              color: "#717680",
                                            }}
                                          ></i>
                                        )}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 2,
                                          flex: 1,
                                          minWidth: 0,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: "#111827",
                                          }}
                                        >
                                          {member.name || "Unknown Member"}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 12,
                                            color: "#717680",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {member.email}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* current user (job owner) */}
                    <div className="career-form-section"
                      style={{ gap: 8 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              backgroundColor: "#E9EAEB",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            {user?.image ? (
                              <img
                                src={user.image}
                                alt={user.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <i
                                className="las la-user"
                                style={{ fontSize: 20, color: "#717680" }}
                              ></i>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#111827",
                              }}
                            >
                              {user?.name || "User"} (You)
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: "#717680",
                              }}
                            >
                              {user?.email || ""}
                            </span>
                          </div>
                        </div>
                        <div style={{ width: 240, position: "relative" }}>
                          <CustomDropdown
                            onSelectSetting={() => {}}
                            screeningSetting="Job Owner"
                            settingList={[{ name: "Job Owner" }]}
                            placeholder="Job Owner"
                          />
                        </div>
                      </div>

                      {/* added team members */}
                      {teamMembers.map((tm, index) => (
                        <div
                          key={tm.member.email || index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                backgroundColor: "#E9EAEB",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              {tm.member.image ? (
                                <img
                                  src={tm.member.image}
                                  alt={tm.member.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <i
                                  className="las la-user"
                                  style={{ fontSize: 20, color: "#717680" }}
                                ></i>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {tm.member.name || "Unknown Member"}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#717680",
                                }}
                              >
                                {tm.member.email}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            {/* role Dropdown */}
                            <div
                              style={{ width: 240, position: "relative" }}
                              data-role-dropdown
                              onMouseLeave={() =>
                                setRoleDropdownOpen({
                                  ...roleDropdownOpen,
                                  [tm.member.email]: false,
                                })
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setRoleDropdownOpen({
                                    ...roleDropdownOpen,
                                    [tm.member.email]:
                                      !roleDropdownOpen[tm.member.email],
                                  })
                                }
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  border: "1px solid #E9EAEB",
                                  borderRadius: 6,
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  color: "#181D27",
                                }}
                              >
                                <span>{tm.role || "Select role"}</span>
                                <i
                                  className="la la-angle-down"
                                  style={{ fontSize: 12 }}
                                ></i>
                              </button>
                              {roleDropdownOpen[tm.member.email] && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    marginTop: 4,
                                    background: "#fff",
                                    border: "1px solid #E9EAEB",
                                    borderRadius: 8,
                                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                    zIndex: 1001,
                                  }}
                                >
                                  {roleOptions.map((role) => (
                                    <div
                                      key={role.name}
                                      onClick={() => {
                                        setTeamMembers(
                                          teamMembers.map((t) =>
                                            t.member.email === tm.member.email
                                              ? { ...t, role: role.name }
                                              : t
                                          )
                                        );
                                        setRoleDropdownOpen({
                                          ...roleDropdownOpen,
                                          [tm.member.email]: false,
                                        });
                                      }}
                                      style={{
                                        padding: 12,
                                        borderBottom:
                                          role.name !==
                                          roleOptions[roleOptions.length - 1]
                                            .name
                                            ? "1px solid #E9EAEB"
                                            : "none",
                                        cursor: "pointer",
                                        background:
                                          tm.role === role.name
                                            ? "#F8F9FC"
                                            : "transparent",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          marginBottom: 4,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: "#181D27",
                                          }}
                                        >
                                          {role.name}
                                        </span>
                                        {tm.role === role.name && (
                                          <i
                                            className="la la-check"
                                            style={{
                                              fontSize: 16,
                                              color: "#039855",
                                            }}
                                          ></i>
                                        )}
                                      </div>
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: "#717680",
                                          lineHeight: "18px",
                                        }}
                                      >
                                        {role.description}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setTeamMembers(
                                  teamMembers.filter(
                                    (t) => t.member.email !== tm.member.email
                                  )
                                )
                              }
                              style={{
                                color: "#717680",
                                background: "transparent",
                                border: "none",
                                padding: 8,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <i
                            className="la la-trash text-red"
                            style={{ fontSize: 20 }}
                            ></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* admin disclaimer */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#717680",
                        }}
                      >
                        *Admins can view all careers regardless of specific
                        access settings.
                      </span>
                  </div>
                </div>
              </div>
            </>
          )}
           {/* end of step 1*/}

          {/* step 2: CV review & pre-screening */}
          {currentStep === 2 && (
            <>
              {/* cv review settings */}
              <div className="layered-card-middle">
                <span className="career-form-title">
                  1. CV Review Settings
                </span>
                <div className="layered-card-content">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderBottom: "1px solid #E4E7EC",
                      paddingBottom: 15,
                    }}
                  >
                    <span className="career-form-label">
                      CV Screening
                    </span>
                    <span className="career-form-label-description--large">
                      Jia automatically endorses candidates who meet the chosen
                      criteria.
                    </span>
                    <div style={{ maxWidth: 320 }}>
                      <CustomDropdown
                        onSelectSetting={(setting) =>
                          setScreeningSetting(setting)
                        }
                        screeningSetting={screeningSetting}
                        settingList={screeningSettingList}
                        placeholder="Good Fit and above"
                      />
                    </div>
                  </div>

                  {/* cv secret prompt */}
                  <div className="career-form-section" style={{ margin: "10px 0 0 0" }}>
                    <span
                      className="career-form-label"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <img
                        src="/auto_awesome.svg"
                        alt="Auto Awesome Icon"
                        className="career-form-img"
                      />
                      CV Secret Prompt{" "}
                      <span className="career-form-optional-text">(optional)</span>
                    </span>

                   <span className="career-form-label-description--large">
                      Secret Prompts give you extra control over Jia's
                      evaluation style, complementing her accurate assessment of
                      requirements from the job description.
                    </span>
                    <textarea
                      className="form-control"
                      placeholder="Enter a secret prompt (e.g. Give higher fit scores to candidates who participate in hackathons or competitions.)"
                      value={cvSecretPrompt}
                      onChange={(e) => setCvSecretPrompt(e.target.value)}
                      style={{ maxHeight: 200, resize: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* pre-screening questions */}
              <div style={{marginBottom: "20px"}} className="layered-card-middle">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span className="career-form-title">
                    2. Pre-Screening Questions{" "}
                    <span className="career-form-optional-text">
                      (optional)
                    </span>
                    <span className="career-form-data-length">
                      {preScreeningQuestions.length}
                    </span>
                  </span>
                  <button
                    style={{
                      width: "fit-content",
                      color: "#fff",
                      background: "#111827",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 25,
                      cursor: "pointer",
                      marginRight: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={() => {
                      const newQuestion = {
                        id: `q-${Date.now()}`,
                        question: "",
                        type: "dropdown" as const,
                        options: ["Option 1"],
                      };
                      setPreScreeningQuestions([
                        ...preScreeningQuestions,
                        newQuestion,
                      ]);
                    }}
                  >
                    <i className="la la-plus" style={{ fontSize: 14 }}></i>
                    Add custom
                  </button>
                </div>
                <div className="layered-card-content">
                  {preScreeningQuestions.length === 0 && (
                    <span className="career-form-no-data">No pre-screening questions added yet.</span>
                  )}

                  {preScreeningQuestions.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      {preScreeningQuestions.map((q, qIndex) => {
                        return (
                          <div
                            key={q.id}
                            style={{
                              border: "1px solid #E9EAEB",
                              borderRadius: 8,
                              padding: 16,
                              backgroundColor: "#fff",
                              position: "relative",
                            }}
                          >
                            {/* Drag Handle */}
                            <div
                              style={{
                                position: "absolute",
                                left: -8,
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "grab",
                                color: "#717680",
                                fontSize: 18,
                              }}
                            >
                              <i className="las la-grip-vertical"></i>
                            </div>

                            {/* question Header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 16,
                              }}
                            >
                              <input
                                type="text"
                                placeholder="Write your question..."
                                value={q.question}
                                onChange={(e) => {
                                  const updated = [...preScreeningQuestions];
                                  updated[qIndex].question = e.target.value;
                                  setPreScreeningQuestions(updated);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "10px 12px",
                                  border: "1px solid #E9EAEB",
                                  borderRadius: 6,
                                  fontSize: 14,
                                }}
                              />
                              <div
                                style={{ position: "relative", width: 140 }}
                                data-question-type-dropdown
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuestionTypeDropdownOpen({
                                      ...questionTypeDropdownOpen,
                                      [q.id]: !questionTypeDropdownOpen[q.id],
                                    })
                                  }
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px",
                                    border: "1px solid #E9EAEB",
                                    borderRadius: 6,
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: 14,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    <i
                                      className={
                                        questionTypes.find(
                                          (t) => t.value === q.type
                                        )?.icon || "las la-list"
                                      }
                                      style={{ fontSize: 16 }}
                                    ></i>
                                    <span>
                                      {questionTypes.find(
                                        (t) => t.value === q.type
                                      )?.name || "Dropdown"}
                                    </span>
                                  </div>
                                  <i
                                    className="la la-angle-down"
                                    style={{ fontSize: 12 }}
                                  ></i>
                                </button>
                                {questionTypeDropdownOpen[q.id] && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: 0,
                                      right: 0,
                                      marginTop: 4,
                                      background: "#fff",
                                      border: "1px solid #E9EAEB",
                                      borderRadius: 8,
                                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                      zIndex: 1000,
                                    }}
                                  >
                                    {questionTypes.map((type) => (
                                      <div
                                        key={type.value}
                                        onClick={() => {
                                          const updated = [
                                            ...preScreeningQuestions,
                                          ];
                                          updated[qIndex].type =
                                            type.value as any;
                                          if (
                                            type.value === "dropdown" ||
                                            type.value === "checkboxes"
                                          ) {
                                            updated[qIndex].options = [
                                              "Option 1",
                                            ];
                                          } else if (type.value === "range") {
                                            updated[qIndex].min = 0;
                                            updated[qIndex].max = 0;
                                            updated[qIndex].currency = "PHP";
                                          } else {
                                            delete updated[qIndex].options;
                                            delete updated[qIndex].min;
                                            delete updated[qIndex].max;
                                          }
                                          setPreScreeningQuestions(updated);
                                          setQuestionTypeDropdownOpen({
                                            ...questionTypeDropdownOpen,
                                            [q.id]: false,
                                          });
                                        }}
                                        style={{
                                          padding: 12,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          cursor: "pointer",
                                          borderBottom:
                                            type.value !==
                                            questionTypes[
                                              questionTypes.length - 1
                                            ].value
                                              ? "1px solid #E9EAEB"
                                              : "none",
                                          background:
                                            q.type === type.value
                                              ? "#F8F9FC"
                                              : "transparent",
                                        }}
                                      >
                                        <i
                                          className={type.icon}
                                          style={{ fontSize: 16 }}
                                        ></i>
                                        <span style={{ fontSize: 14 }}>
                                          {type.name}
                                        </span>
                                        {q.type === type.value && (
                                          <i
                                            className="la la-check"
                                            style={{
                                              marginLeft: "auto",
                                              color: "#039855",
                                            }}
                                          ></i>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* options for dropdown/checkboxes */}
                            {(q.type === "dropdown" ||
                              q.type === "checkboxes") &&
                              q.options && (
                                <div className="career-form-section">
                                  {q.options.map((option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 14,
                                          color: "#717680",
                                          minWidth: 24,
                                        }}
                                      >
                                        {optIndex + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => {
                                          const updated = [
                                            ...preScreeningQuestions,
                                          ];
                                          if (updated[qIndex].options) {
                                            updated[qIndex].options[optIndex] =
                                              e.target.value;
                                          }
                                          setPreScreeningQuestions(updated);
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: "8px 12px",
                                          border: "1px solid #E9EAEB",
                                          borderRadius: 6,
                                          fontSize: 14,
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [
                                            ...preScreeningQuestions,
                                          ];
                                          if (updated[qIndex].options) {
                                            updated[qIndex].options = updated[
                                              qIndex
                                            ].options.filter(
                                              (_, i) => i !== optIndex
                                            );
                                          }
                                          setPreScreeningQuestions(updated);
                                        }}
                                        style={{
                                          color: "#717680",
                                          background: "transparent",
                                          border: "none",
                                          cursor: "pointer",
                                          padding: 4,
                                        }}
                                      >
                                        <i className="la la-times"></i>
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [
                                        ...preScreeningQuestions,
                                      ];
                                      if (updated[qIndex].options) {
                                        updated[qIndex].options.push(
                                          `Option ${
                                            (updated[qIndex].options?.length ||
                                              0) + 1
                                          }`
                                        );
                                      }
                                      setPreScreeningQuestions(updated);
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "8px 12px",
                                      border: "1px solid #E9EAEB",
                                      borderRadius: 6,
                                      background: "#fff",
                                      cursor: "pointer",
                                      fontSize: 14,
                                      color: "#111827",
                                      width: "fit-content",
                                    }}
                                  >
                                    <i className="la la-plus"></i>
                                    Add Option
                                  </button>
                                </div>
                              )}

                            {/* Range Inputs */}
                            {q.type === "range" && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 12,
                                  marginBottom: 12,
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: "#717680",
                                      marginBottom: 4,
                                      display: "block",
                                    }}
                                  >
                                    Minimum
                                  </span>
                                  <div style={{ position: "relative" }}>
                                    <span
                                      style={{
                                        position: "absolute",
                                        left: 12,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#6c757d",
                                        fontSize: 16,
                                      }}
                                    >
                                      ₱
                                    </span>
                                    <input
                                      type="number"
                                      value={q.min || 0}
                                      onChange={(e) => {
                                        const updated = [
                                          ...preScreeningQuestions,
                                        ];
                                        updated[qIndex].min = Number(
                                          e.target.value
                                        );
                                        setPreScreeningQuestions(updated);
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px 8px 28px",
                                        border: "1px solid #E9EAEB",
                                        borderRadius: 6,
                                        fontSize: 14,
                                      }}
                                    />
                                  </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: "#717680",
                                      marginBottom: 4,
                                      display: "block",
                                    }}
                                  >
                                    Maximum
                                  </span>
                                  <div style={{ position: "relative" }}>
                                    <span
                                      style={{
                                        position: "absolute",
                                        left: 12,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#6c757d",
                                        fontSize: 16,
                                      }}
                                    >
                                      ₱
                                    </span>
                                    <input
                                      type="number"
                                      value={q.max || 0}
                                      onChange={(e) => {
                                        const updated = [
                                          ...preScreeningQuestions,
                                        ];
                                        updated[qIndex].max = Number(
                                          e.target.value
                                        );
                                        setPreScreeningQuestions(updated);
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px 8px 28px",
                                        border: "1px solid #E9EAEB",
                                        borderRadius: 6,
                                        fontSize: 14,
                                      }}
                                    />
                                  </div>
                                </div>
                                <div style={{ width: 100, marginTop: 20 }}>
                                  <CustomDropdown
                                    onSelectSetting={(currency) => {
                                      const updated = [
                                        ...preScreeningQuestions,
                                      ];
                                      updated[qIndex].currency = currency;
                                      setPreScreeningQuestions(updated);
                                    }}
                                    screeningSetting={q.currency || "PHP"}
                                    settingList={[{ name: "PHP" }]}
                                    placeholder="PHP"
                                  />
                                </div>
                              </div>
                            )}

                            {/* delete question button */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 12,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPreScreeningQuestions(
                                    preScreeningQuestions.filter(
                                      (_, i) => i !== qIndex
                                    )
                                  );
                                }}
                               style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 16px",
                                background: "transparent", 
                                color: "#B32318",          
                                border: "1px solid #F04438", 
                                borderRadius: 25,
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 700
                              }}
                              >
                                <i className="las la-trash" style={{fontSize: 18}}></i>
                                Delete Question
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* suggested questions */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      marginTop: 24,
                      paddingTop: 24,
                      borderTop: "1px solid #E9EAEB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#414651",
                      }}
                    >
                      Suggested Pre-screening Questions:
                    </span>
                    {suggestedPreScreeningQuestions.map((s) => {
                      const isAdded = preScreeningQuestions.some(
                        (q) => q.question === s.subtitle
                      );
                      return (
                        <div
                          key={s.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <span
                              style={{
                                fontSize: 14,
                                color: "#414651",
                                fontWeight: 700,
                              }}
                            >
                              {s.title}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "#717680" }}>
                              {s.subtitle}
                            </span>
                          </div>
                          <button
                            style={{
                              color: isAdded ? "#717680" : "#111827",
                              background: isAdded ? "#E9EAEB" : "#fff",
                              border: "1px solid #D5D7DA",
                              padding: "6px 12px",
                              borderRadius: 25,
                              cursor: isAdded ? "not-allowed" : "pointer",
                              minWidth: 60,
                              fontSize: 14,
                            }}
                            disabled={isAdded}
                            onClick={() => {
                              if (!isAdded) {
                                const newQuestion = {
                                  id: `q-${Date.now()}`,
                                  question: s.subtitle,
                                  type: s.type,
                                  ...(s.options && { options: [...s.options] }),
                                  ...(s.type === "range" && {
                                    min: 0,
                                    max: 0,
                                    currency: "PHP",
                                  }),
                                };
                                setPreScreeningQuestions([
                                  ...preScreeningQuestions,
                                  newQuestion,
                                ]);
                              }
                            }}
                          >
                            {isAdded ? "Added" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* step 3: AI interview setup */}
          {currentStep === 3 && (
            <>
              <div className="layered-card-middle">
                <span className="career-form-title">1. AI Interview Settings</span>
                <div className="layered-card-content">
                  {/* AI Interview Screening */}
                  <div
                    className="career-form-section"
                    style={{
                      borderBottom: "1px solid #E4E7EC",
                      paddingBottom: 15,
                    }}
                  >
                    <span className="career-form-label">
                      AI Interview Screening
                    </span>
                    <span className="career-form-label-description--large">
                      Jia automatically endorses candidates who meet the chosen
                      criteria.
                    </span>
                    <div style={{ maxWidth: 320 }}>
                      <CustomDropdown
                        onSelectSetting={(setting) =>
                          setScreeningSetting(setting)
                        }
                        screeningSetting={screeningSetting}
                        settingList={screeningSettingList}
                        placeholder="Good Fit and above"
                      />
                    </div>
                  </div>

                  {/* require video on interview */}
                  <div className="career-form-section"
                    style={{ gap: 8, marginBottom: 0}}
                  >
                   <span className="career-form-label">
                      Require Video on Interview
                    </span>
                    <span className="career-form-label-description--large">
                      Require candidates to keep their camera on. Recordings
                      will appear on their analysis page.
                    </span>
                 <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Left Section: Icon + Text */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="la la-video" style={{ fontSize: 20, color: "#111827" }}></i>
                    <span style={{ fontSize: 16, color: "#414651" }}>Require Video Interview</span>
                  </div>

                  {/* Right Section: Switch + Yes/No Label */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px", 
                    }}
                  >
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={requireVideo}
                        onChange={() => setRequireVideo(!requireVideo)}
                      />
                      <span className="slider round"></span>
                    </label>
                    <span style={{ fontSize: 16, color: "#717680" , position: "relative", top: "-5px",  }}>
                      {requireVideo ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                  </div>
                </div>
              </div>

              <div style={{marginBottom: "20px"}} className="layered-card-middle">
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span
                    className="career-form-title"
                    style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    }}
                  >
                  2. AI Interview Questions
                  <span className="career-form-data-length">
                    {questions.reduce((acc, group) => acc + group.questions.length, 0)}
                  </span>
      
                </span>
                  <button
                    className="career-form-generate-btn"
                    onClick={() => {
                    generateAllQuestions();
                  }}
                >
                  <img
                    src="/generate-vector.svg"
                    alt="Generate Icon"
                    className="career-form-img"
                  />
                   Generate all questions
                    </button>
                  </div>
                <div className="layered-card-content">
                   <InterviewQuestionGeneratorV2
                    questions={questions}
                    setQuestions={setQuestions}
                    jobTitle={jobTitle}
                    description={description}
                    isGeneratingQuestions={isGeneratingQuestions}
                  />
                </div>
              </div>
            </>
          )}

          {/* step 4: Review Career */}
          {currentStep === 4 && (
            <>
              {/* Career Details & Team Access Review Section */}
              <div className="layered-card-middle">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span className="career-form-title">
                    Career Details & Team Access
                  </span>
                 <button
                  className="career-form-edit-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  <img
                  src="/pencil-edit-2.svg"
                  alt="Edit"
                  style={{width: "16px", height: "16px"}}
                  />
                </button>

                </div>
                <div className="layered-card-content">
                  <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    rowGap: "16px",
                    columnGap: "24px",
                    marginTop: "10px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  {/* Job Title */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <h3 className="career-form-label">
                      Job Title
                    </h3>
                    <p className="career-form-info-label">{jobTitle}</p>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <h3 className="career-form-label">
                      Employment Type
                    </h3>
                     <p className="career-form-info-label">
                      {employmentType}
                    </p>
                  </div>

                  {/* Work Arrangement */}
                  <div>
                     <h3 className="career-form-label">
                      Work Arrangement
                    </h3>
                   <p className="career-form-info-label">
                      {workSetup}
                    </p>
                    {workSetupRemarks && (
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#414651",
                          marginTop: "2px",
                        }}
                      >
                        {workSetupRemarks}
                      </p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                     <h3 className="career-form-label">
                      Country
                    </h3>
                   <p className="career-form-info-label">{country}</p>
                  </div>

                  {/* State / Province */}
                  <div>
                     <h3 className="career-form-label">
                      State / Province
                    </h3>
                    <p className="career-form-info-label">{province}</p>
                  </div>

                  {/* City */}
                  <div>
                     <h3 className="career-form-label">
                      City
                    </h3>
                    <p className="career-form-info-label">{city}</p>
                  </div>

                  {/* Minimum Salary */}
                  <div>
                    <h3 className="career-form-label">
                      Minimum Salary
                    </h3>
                    <p className="career-form-info-label">
                      {salaryNegotiable || !minimumSalary
                        ? "Negotiable"
                        : `₱${Number(minimumSalary).toLocaleString()}`}
                    </p>
                  </div>

                  {/* Maximum Salary */}
                  <div>
                     <h3 className="career-form-label">
                      Maximum Salary
                    </h3>
                    <p className="career-form-info-label">
                      {salaryNegotiable || !maximumSalary
                        ? "Negotiable"
                        : `₱${Number(maximumSalary).toLocaleString()}`}
                    </p>
                  </div>
                </div>


                  <div style={{ marginTop: "10px" ,paddingBottom: "8px",
                    borderBottom: "1px solid #E5E7EB" }}>
                    <h3 className="career-form-label">
                      Job Description
                    </h3>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#414651",
                      }}
                      dangerouslySetInnerHTML={{ __html: description || "" }}
                    />
                  </div>

                  <div style={{ marginTop: "10px" 
                    }}>
                    <h3 className="career-form-label">
                      Team Access
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {teamMembers.map((tm, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: idx !== teamMembers.length - 1 ? "1px solid #F3F4F6" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: "#F3F4F6",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            {tm.member.image ? (
                              <img
                                src={tm.member.image}
                                alt={tm.member.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: "100%",
                                  fontSize: "16px",
                                  fontWeight: 500,
                                  color: "#6B7280",
                                }}
                              >
                                {tm.member.name?.[0]}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: "#111827",
                                fontSize: "15px",
                              }}
                            >
                              {tm.member.name}
                            
                            </span>
                            <span
                              style={{
                                color: "#6B7280",
                                fontSize: "14px",
                              }}
                            >
                              {tm.member.email}
                            </span>
                          </div>
                        </div>

                        <p
                          style={{
                            color: "#111827",
                            fontSize: "14px",
                            fontWeight: 500,
                            margin: 0,
                          }}
                        >
                          {tm.role}
                        </p>
                      </div>
                    ))}

                    </div>
                  </div>
                </div>
              </div>

              {/* CV Review & Pre-screening Review Section */}
              <div
                className="layered-card-middle"
                style={{ marginTop: "20px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                   <span className="career-form-title">
                    CV Review & Pre-screening Questions
                  </span>
                 
                  <button
                  className="career-form-edit-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  <img
                  src="/pencil-edit-2.svg"
                  alt="Edit"
                  style={{width: "16px", height: "16px"}}
                  />
                </button>
                </div>
                <div className="layered-card-content">
                  <div style={{ marginTop: "10px", marginBottom: "10px",  paddingBottom: "8px",
                    borderBottom: "1px solid #E5E7EB" }}>
                  <div style={{ marginBottom: "16px", borderBottom: "1px solid #E5E7EB", paddingBottom: "12px" }}>
                    <h3 className="career-form-label">
                      CV Screening
                    </h3>

                      <p
                        
                      style={{
                          fontSize: "16px",
                        color: "#414651",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                        margin: 0,
                      }}
                    >
                      Automatically endorse candidates who are{" "}
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#2563EB",
                          backgroundColor: "#EFF6FF",
                          border: "1px solid #BFDBFE",
                          borderRadius: "9999px",
                          padding: "2px 10px",
                        }}
                      >
                        {screeningSetting}
                      </span>
                    </p>
                  </div>

                    
                    <h3
                      className="career-form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                  >
                      <img
                        src="/auto_awesome.svg"
                        alt="Auto Awesome Icon"
                        className="career-form-img"
              
                        />
                        CV Secret Prompt
                      </h3>


            <div
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#414651",
              }}
            >
              {cvSecretPrompt ? (
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  {cvSecretPrompt.split("\n").map((line, index) => (
                    <li key={index} style={{ marginBottom: "6px" }}>
                      {line.replace(/^[-•]\s*/, "")}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="career-form-no-data" style={{fontWeight: 400}}>Not specified.</span>
              )}
            </div>
          </div>

               <div>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
         Pre-Screening Questions{" "}
          {preScreeningQuestions.length > 0 ? (
            <span
              style={{
                display: "inline-flex",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 500,
                color: "#111827",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                marginLeft: "5px"
              }}
            >
              {preScreeningQuestions.length}
            </span>
          ) : null}
        </h3>

                {preScreeningQuestions.length === 0 ? (
                      <span className="career-form-no-data">
                          No pre-screening questions added.
                        </span>
 
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {preScreeningQuestions.map((q, idx) => (
                <div key={idx} style={{ color: "#414651" }}>
                  <p
                    style={{
                      fontWeight: 500,
                      fontSize: "16px",
                      marginBottom: "6px",
                    }}
                  >
                   {idx + 1}. {q.question}
               </p>

          {/* Dropdown or multiple choice options */}
          {q.type === "dropdown" && q.options && (
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: "20px",
                margin: 0,
                fontSize: "16px",
              fontWeight: 500,
                color: "#414651",
              }}
            >
              {q.options.map((opt, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  {opt}
                </li>
              ))}
            </ul>
          )}

          {/* Range type display (salary, etc.) */}
          {q.type === "range" && (
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: "20px",
                margin: 0,
                fontSize: "14px",
                color: "#111827",
              }}
            >
              <li>
                Preferred: {q.currency}{" "}
                {q.min?.toLocaleString()} – {q.currency}{" "}
                {q.max?.toLocaleString()}
              </li>
            </ul>
          )}
        </div>
      ))}
    </div>
  )}
</div>

                </div>
              </div>

              {/* AI Interview Setup Review Section */}
              <div
                className="layered-card-middle"
                style={{ marginTop: "20px" , marginBottom: "20px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                 <span className="career-form-title">
                    AI Interview Setup
                  </span>
                  <button
                  className="career-form-edit-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  <img
                  src="/pencil-edit-2.svg"
                  alt="Edit"
                  style={{width: "16px", height: "16px"}}
                  />
                </button>
                </div>
                <div className="layered-card-content">
                    <div style={{borderBottom: "1px solid #E5E7EB",   }}>
                    <h3 className="career-form-label">
                      AI Interview Settings
                    </h3>
                    <div
                     
                    >
                      <div style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "12px" }} >
                            <p
                      style={{
                          fontSize: "16px",
                        color: "#414651",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                        margin: 0,
                      }}
                    >
                      Automatically endorse candidates who are{" "}    <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#2563EB",
                          backgroundColor: "#EFF6FF",
                          border: "1px solid #BFDBFE",
                          borderRadius: "9999px",
                          padding: "2px 10px",
                        }}
                      >
                        {screeningSetting}
                      </span>
                        </p>
                        
                      </div>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0"}}>
                        <span className="career-form-label">
                         Require Video on Interview
                        </span>
                       
                        <span
                        style={{
                          fontSize: "16px",
                          color: "#414651",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        {requireVideo ? (
                          <>
                            Yes
                            <i className="las la-check-circle"  style={{ color: "#28a745", fontSize: "20px" }}></i>
                          </>
                        ) : (
                          <>
                            No
                            <i className="las la-times-circle" style={{ color: "#dc3545", fontSize: "20px" }}></i>
                          </>
                        )}
                      </span>

                      </div>
                    </div>
                  </div>

                  <div style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "12px" }}>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      AI Interview Secret Prompt
                    </h3>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#111827",
                      }}
                    >
                      {aiSecretPrompt || (
                        <span style={{ color: "#414651" }}>
                          Not specified
                        </span>
                      )}
                    </div>
                  </div>
                

              <div>
  <h3
   className="career-form-label"
  >
    Interview Questions{" "}
    {questions.reduce((acc, c) => acc + c.questions.length, 0) > 0 && (
      <span className="career-form-data-length">
        {questions.reduce((acc, c) => acc + c.questions.length, 0)}
      </span>
    )}
  </h3>

  {questions.filter((cat) => cat.questions.length > 0).length === 0 ? (
    <div className="career-form-no-data">
      No interview questions added.
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {questions
        .filter((cat) => cat.questions.length > 0)
        .map((category) => (
          <div key={category.id}>
            <p
              style={{
                fontWeight: 700,
                fontSize: "14px",
                color: "#414651",
                marginBottom: "8px",
              }}
            >
              {category.category}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {category.questions.map((q, qi) => (
                <div key={qi} style={{ display: "flex", alignItems: "flex-start" }}>
                  <span
                    style={{
                      color: "#414651",
                      minWidth: "20px",
                      fontSize: "16px",
                    }}
                  >
                    {qi + 1}.
                  </span>
                  <span
                    style={{
                      color: "#414651",
                       fontSize: "16px",
                    }}
                  >
                    {typeof q === "string" ? q : (q as any)?.question}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )}
</div>

                </div>
              </div>
            </>
          )}
        </div>

        {/* right column */}
        <div
          style={{
            width: "100%",
            flex: "0 1 33.3333%",
            maxWidth: 420,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* tips section */}
          <div className="layered-card-middle">
         
             {/* tips title label */}
            <span className="career-form-tips-label">
              <img src="/tips-vector.svg" alt="Tips icon" className="career-form-img" />
              Tips
            </span>

            {/* tips content */}
            <div className="layered-card-content">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* tips content 01 */}
                <span className="career-form-tips-main">
                <span className="career-form-tips-title">Use clear, standard job titles</span>{" "}
                for better searchability (e.g., "Software Engineer" instead of "Code Ninja" or
                "Tech Rockstar").
                </span>

                {/* tips content 02 */}
                <span className="career-form-tips-main">
                  <span className="career-form-tips-title">Avoid abbreviations</span>{" "}
                  or internal role codes that applicants may not understand
                  (e.g., use "QA Engineer" instead of "QE II" or "QA-TL").
                </span>

                {/* tips content 03 */}
                <span className="career-form-tips-main">
                  <span className="career-form-tips-title">Keep it concise —</span>{" "}
                  job titles should be no more than a few words (2-4 max),
                  avoiding fluff or marketing terms.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* modal */}
      {showSaveModal && (
        <CareerActionModal
          action={showSaveModal}
          onAction={(action) => saveCareer(action)}
        />
      )}

      {/* loading */}
      {isSavingCareer && (
        <FullScreenLoadingAnimation
          title={formType === "add" ? "Saving career..." : "Updating career..."}
          subtext={`Please wait while we are ${
            formType === "add" ? "saving" : "updating"
          } the career`}
        />
      )}
    </div>
  );
}
