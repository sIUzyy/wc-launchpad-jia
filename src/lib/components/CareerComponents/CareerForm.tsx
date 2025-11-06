"use client";

import { useEffect, useRef, useState } from "react";
import InterviewQuestionGeneratorV2 from "./InterviewQuestionGeneratorV2";
import RichTextEditor from "@/lib/components/CareerComponents/RichTextEditor";
import CustomDropdown from "@/lib/components/CareerComponents/CustomDropdown";
import philippineCitiesAndProvinces from "../../../../public/philippines-locations.json";
import { candidateActionToast, errorToast } from "@/lib/Utils";
import { useAppContext } from "@/lib/context/AppContext";
import axios from "axios";
import CareerActionModal from "./CareerActionModal";
import FullScreenLoadingAnimation from "./FullScreenLoadingAnimation";
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
  const [currentStep, setCurrentStep] = useState(1);
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
  const [selectedTeamMember, setSelectedTeamMember] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [cvSecretPrompt, setCvSecretPrompt] = useState(
    career?.cvSecretPrompt || ""
  );
  const [preScreeningQuestions, setPreScreeningQuestions] = useState<string[]>(
    career?.preScreeningQuestions || []
  );
  const [aiSecretPrompt, setAiSecretPrompt] = useState(
    career?.aiSecretPrompt || ""
  );
  const suggestedPreScreeningQuestions = [
    {
      title: "Notice Period",
      subtitle: "How long is your notice period?",
      key: "Notice Period",
    },
    {
      title: "Work Setup",
      subtitle: "How often are you willing to report to the office each week?",
      key: "Work Setup",
    },
    {
      title: "Asking Salary",
      subtitle: "How much is your expected monthly salary?",
      key: "Asking Salary",
    },
  ];

  const isFormValid = () => {
    return (
      jobTitle?.trim().length > 0 &&
      description?.trim().length > 0 &&
      questions.some((q) => q.questions.length > 0) &&
      workSetup?.trim().length > 0
    );
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

  const handleSaveAndContinue = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }
    if (formType === "add") {
      confirmSaveCareer("active");
    } else {
      updateCareer("active");
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
      let userInfoSlice = {
        image: user.image,
        name: user.name,
        email: user.email,
      };
      const career = {
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
        status,
        employmentType,
      };

      try {
        const response = await axios.post("/api/add-career", career);
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
                Career added {status === "active" ? "and published" : ""}
              </span>
            </div>,
            1300,
            <i
              className="la la-check-circle"
              style={{ color: "#039855", fontSize: 32 }}
            ></i>
          );
          setTimeout(() => {
            window.location.href = `/recruiter-dashboard/careers`;
          }, 1300);
        }
      } catch (error) {
        errorToast("Failed to add career", 1300);
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
            Add new career
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
                confirmSaveCareer("inactive");
              }}
            >
              Save as Unpublished
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
              Save and Continue
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
      {/* Stepper */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
          marginTop: 4,
          marginBottom: 8,
        }}
      >
        {[
          { id: 1, label: "Career details & team access" },
          { id: 2, label: "CV review & pre-screening" },
          { id: 3, label: "AI interview setup" },
          { id: 4, label: "Review career" },
        ].map((step) => (
          <div
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #E9EAEB",
              backgroundColor: currentStep === step.id ? "#111827" : "#fff",
              color: currentStep === step.id ? "#fff" : "#111827",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: currentStep === step.id ? "#fff" : "#111827",
                color: currentStep === step.id ? "#111827" : "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {step.id}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{step.label}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          gap: 20,
          alignItems: "flex-start",
          marginTop: 16,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "66.6667%",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            border: "1px solid red",
          }}
        >
          {currentStep === 1 && (
            <>
              {/* career-information section*/}
              <div className="">
                <div className="layered-card-middle">
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 700, // bold
                      lineHeight: "24px",
                      color: "#181D27",
                      marginLeft: "15px",
                    }}
                  >
                    1. Career Information
                  </span>
                  <div className="layered-card-content">
                    {/* basic-information section*/}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          lineHeight: "20px",
                          color: "#181D27",
                        }}
                      >
                        Basic Information
                      </span>

                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          lineHeight: "20px",
                          color: "#414651",
                        }}
                      >
                        Job Title
                      </span>

                      <input
                        value={jobTitle}
                        className="form-control"
                        placeholder="Enter job title"
                        onChange={(e) => {
                          setJobTitle(e.target.value || "");
                        }}
                      ></input>
                    </div>

                    {/* work-setting section*/}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          lineHeight: "20px",
                          color: "#181D27",
                        }}
                      >
                        Work Setting
                      </span>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >
                        <div style={{ width: "50%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            Employment Type
                          </span>
                          <CustomDropdown
                            onSelectSetting={(employmentType) => {
                              setEmploymentType(employmentType);
                            }}
                            screeningSetting={employmentType}
                            settingList={employmentTypeOptions}
                            placeholder="Choose employment type"
                          />
                        </div>
                        <div style={{ width: "50%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            Arrangement
                          </span>
                          <CustomDropdown
                            onSelectSetting={(setting) => {
                              setWorkSetup(setting);
                            }}
                            screeningSetting={workSetup}
                            settingList={workSetupOptions}
                            placeholder="Choose work arrangement "
                          />
                        </div>
                      </div>
                    </div>

                    {/* location section*/}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          lineHeight: "20px",
                          color: "#181D27",
                        }}
                      >
                        Location
                      </span>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >
                        <div style={{ width: "100%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            Country
                          </span>
                          <CustomDropdown
                            onSelectSetting={(setting) => {
                              setCountry(setting);
                            }}
                            screeningSetting={country}
                            settingList={[]}
                            placeholder="Select Country"
                          />
                        </div>
                        <div style={{ width: "100%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            State / Province
                          </span>
                          <CustomDropdown
                            onSelectSetting={(province) => {
                              setProvince(province);
                              const provinceObj = provinceList.find(
                                (p) => p.name === province
                              );
                              const cities =
                                philippineCitiesAndProvinces.cities.filter(
                                  (city) => city.province === provinceObj.key
                                );
                              setCityList(cities);
                              setCity(cities[0].name);
                            }}
                            screeningSetting={province}
                            settingList={provinceList}
                            placeholder="Choose state / province"
                          />
                        </div>
                        <div style={{ width: "100%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            City
                          </span>
                          <CustomDropdown
                            onSelectSetting={(city) => {
                              setCity(city);
                            }}
                            screeningSetting={city}
                            settingList={cityList}
                            placeholder="Choose city"
                          />
                        </div>
                      </div>
                    </div>

                    {/* salary section*/}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            lineHeight: "20px",
                            color: "#181D27",
                          }}
                        >
                          Salary
                        </span>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: 5,
                            alignItems: "flex-start",
                            minWidth: "130px",
                          }}
                        >
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={salaryNegotiable}
                              onChange={() =>
                                setSalaryNegotiable(!salaryNegotiable)
                              }
                            />
                            <span className="slider round"></span>
                          </label>
                          <span
                            style={{
                              fontWeight: 500,
                              fontSize: "14px",
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            {salaryNegotiable ? "Negotiable" : "Fixed"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >
                        <div style={{ width: "100%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            Minimum Salary
                          </span>
                          <div style={{ position: "relative" }}>
                            <span
                              style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}
                            >
                              ₱
                            </span>
                            <input
                              type="number"
                              className="form-control"
                              style={{ paddingLeft: "28px" }}
                              placeholder="0"
                              min={0}
                              value={minimumSalary}
                              onChange={(e) => {
                                setMinimumSalary(e.target.value || "");
                              }}
                            />
                            <span
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}
                            >
                              PHP
                            </span>
                          </div>
                        </div>
                        <div style={{ width: "100%" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              lineHeight: "20px",
                              color: "#414651",
                            }}
                          >
                            Maximum Salary
                          </span>
                          <div style={{ position: "relative" }}>
                            <span
                              style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}
                            >
                              ₱
                            </span>
                            <input
                              type="number"
                              className="form-control"
                              style={{ paddingLeft: "28px" }}
                              placeholder="0"
                              min={0}
                              value={maximumSalary}
                              onChange={(e) => {
                                setMaximumSalary(e.target.value || "");
                              }}
                            ></input>
                            <span
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                fontSize: "16px",
                                pointerEvents: "none",
                              }}
                            >
                              PHP
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="layered-card-middle">
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "24px",
                    color: "#181D27",
                    marginLeft: "15px",
                  }}
                >
                  2. Job Description
                </span>
                <div className="layered-card-content">
                  <RichTextEditor setText={setDescription} text={description} />
                </div>
              </div>

              <div className="layered-card-middle">
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "24px",
                    color: "#181D27",
                    marginLeft: "15px",
                  }}
                >
                  3. Team Access
                </span>
                <div className="layered-card-content">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        lineHeight: "20px",
                        color: "#181D27",
                      }}
                    >
                      Add more members
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: "12px",
                        lineHeight: "18px",
                        color: "#717680",
                      }}
                    >
                      You can add other members to collaborate on this career
                    </span>
                    <div style={{ maxWidth: 480 }}>
                      <CustomDropdown
                        onSelectSetting={(member) =>
                          setSelectedTeamMember(member)
                        }
                        screeningSetting={selectedTeamMember}
                        settingList={[]}
                        placeholder="Select a team member"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{
                          width: "fit-content",
                          background: selectedTeamMember
                            ? "#111827"
                            : "#D5D7DA",
                          color: "#fff",
                          border: "1px solid #E9EAEB",
                          padding: "8px 16px",
                          borderRadius: "60px",
                          cursor: selectedTeamMember
                            ? "pointer"
                            : "not-allowed",
                        }}
                        disabled={!selectedTeamMember}
                        onClick={() => {
                          if (!selectedTeamMember) return;
                          if (!teamMembers.includes(selectedTeamMember)) {
                            setTeamMembers([
                              ...teamMembers,
                              selectedTeamMember,
                            ]);
                            setSelectedTeamMember("");
                          }
                        }}
                      >
                        Add member
                      </button>
                    </div>
                    {teamMembers.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          marginTop: 8,
                        }}
                      >
                        {teamMembers.map((m) => (
                          <div
                            key={m}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              border: "1px solid #E9EAEB",
                              borderRadius: 8,
                            }}
                          >
                            <span style={{ fontSize: 14, color: "#111827" }}>
                              {m}
                            </span>
                            <button
                              style={{
                                color: "#414651",
                                background: "#fff",
                                border: "1px solid #D5D7DA",
                                padding: "6px 12px",
                                borderRadius: 20,
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                setTeamMembers(
                                  teamMembers.filter((x) => x !== m)
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 2. CV review & pre-screening*/}
          {currentStep === 2 && (
            <>
              {/* cv review settings */}
              <div className="layered-card-middle">
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "24px",
                    color: "#181D27",
                    marginLeft: "15px",
                  }}
                >
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
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        lineHeight: "20px",
                        color: "#181D27",
                      }}
                    >
                      CV Screening
                    </span>
                    <span style={{ fontSize: 12, color: "#717680" }}>
                      Jia automatically endorses candidates who meet the chosen
                      criteria.
                    </span>
                    <div style={{ maxWidth: 360 }}>
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

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        lineHeight: "20px",
                        color: "#181D27",
                      }}
                    >
                      ✨ CV Secret Prompt{" "}
                      <span style={{ color: "#717680", fontWeight: 500 }}>
                        (optional)
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: "#717680" }}>
                      Secret Prompts give you extra control over Jia's
                      evaluation style, complementing her accurate assessment of
                      requirements from the job description.
                    </span>
                    <textarea
                      className="form-control"
                      placeholder="Enter a secret prompt (e.g. Give higher fit scores to candidates who participate in hackathons or competitions.)"
                      value={cvSecretPrompt}
                      onChange={(e) => setCvSecretPrompt(e.target.value)}
                      style={{ minHeight: 90 }}
                    />
                  </div>
                </div>
              </div>

              {/* pre-screening questions */}
              <div className="layered-card-middle">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      lineHeight: "24px",
                      color: "#181D27",
                      marginLeft: "15px",
                    }}
                  >
                    2. Pre-Screening Questions{" "}
                    <span style={{ color: "#717680", fontWeight: 500 }}>
                      (optional)
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                        fontSize: 12,
                        color: "#717680",
                        border: "1px solid #E9EAEB",
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {preScreeningQuestions.length}
                    </span>
                  </span>
                  <button
                    style={{
                      width: "fit-content",
                      color: "#111827",
                      background: "#fff",
                      border: "1px solid #D5D7DA",
                      padding: "6px 12px",
                      borderRadius: 999,
                      cursor: "pointer",
                      marginRight: 12,
                    }}
                    onClick={() => {
                      const label = prompt(
                        "Enter custom pre-screening question"
                      );
                      if (label && !preScreeningQuestions.includes(label)) {
                        setPreScreeningQuestions([
                          ...preScreeningQuestions,
                          label,
                        ]);
                      }
                    }}
                  >
                    + Add custom
                  </button>
                </div>
                <div className="layered-card-content">
                  {preScreeningQuestions.length === 0 && (
                    <div
                      style={{
                        border: "1px dashed #E9EAEB",
                        borderRadius: 8,
                        padding: 12,
                        color: "#717680",
                        fontSize: 14,
                      }}
                    >
                      No pre-screening questions added yet.
                    </div>
                  )}

                  {preScreeningQuestions.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {preScreeningQuestions.map((q) => (
                        <div
                          key={q}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            border: "1px solid #E9EAEB",
                            borderRadius: 8,
                            padding: "8px 12px",
                          }}
                        >
                          <span style={{ fontSize: 14, color: "#111827" }}>
                            {q}
                          </span>
                          <button
                            style={{
                              color: "#414651",
                              background: "#fff",
                              border: "1px solid #D5D7DA",
                              padding: "6px 12px",
                              borderRadius: 20,
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              setPreScreeningQuestions(
                                preScreeningQuestions.filter((x) => x !== q)
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#181D27",
                      }}
                    >
                      Suggested Pre-screening Questions:
                    </span>
                    {suggestedPreScreeningQuestions.map((s) => (
                      <div
                        key={s.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          border: "1px solid #E9EAEB",
                          borderRadius: 8,
                          padding: "8px 12px",
                        }}
                      >
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              color: "#111827",
                              fontWeight: 600,
                            }}
                          >
                            {s.title}
                          </span>
                          <span style={{ fontSize: 12, color: "#717680" }}>
                            {s.subtitle}
                          </span>
                        </div>
                        <button
                          style={{
                            color: preScreeningQuestions.includes(s.title)
                              ? "#717680"
                              : "#111827",
                            background: "#fff",
                            border: "1px solid #D5D7DA",
                            padding: "6px 12px",
                            borderRadius: 20,
                            cursor: preScreeningQuestions.includes(s.title)
                              ? "not-allowed"
                              : "pointer",
                            minWidth: 60,
                          }}
                          disabled={preScreeningQuestions.includes(s.title)}
                          onClick={() => {
                            if (!preScreeningQuestions.includes(s.title)) {
                              setPreScreeningQuestions([
                                ...preScreeningQuestions,
                                s.title,
                              ]);
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3. AI Interview Setup */}
          {currentStep === 3 && (
            <>
              <div className="layered-card-middle">
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "24px",
                    color: "#181D27",
                    marginLeft: "15px",
                  }}
                >
                  1. AI Interview Settings
                </span>
                <div className="layered-card-content">
                  {/* AI Interview Screening */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderBottom: "1px solid #E4E7EC",
                      paddingBottom: 15,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#181D27",
                      }}
                    >
                      AI Interview Screening
                    </span>
                    <span style={{ fontSize: 12, color: "#717680" }}>
                      Jia automatically endorses candidates who meet the chosen
                      criteria.
                    </span>
                    <div style={{ maxWidth: 360 }}>
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

                  {/* Require Video on Interview */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderBottom: "1px solid #E4E7EC",
                      padding: "15px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#181D27",
                      }}
                    >
                      Require Video on Interview
                    </span>
                    <span style={{ fontSize: 12, color: "#717680" }}>
                      Require candidates to keep their camera on. Recordings
                      will appear on their analysis page.
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <i
                        className="la la-video"
                        style={{ fontSize: 18, color: "#111827" }}
                      ></i>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={requireVideo}
                          onChange={() => setRequireVideo(!requireVideo)}
                        />
                        <span className="slider round"></span>
                      </label>
                      <span style={{ fontSize: 12, color: "#717680" }}>
                        {requireVideo ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {/* AI Interview Secret Prompt */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      paddingTop: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#181D27",
                      }}
                    >
                      ✨ AI Interview Secret Prompt{" "}
                      <span style={{ color: "#717680", fontWeight: 500 }}>
                        (optional)
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: "#717680" }}>
                      Secret Prompts give you extra control over Jia's
                      evaluation style, complementing her accurate assessment of
                      requirements from the job description.
                    </span>
                    <textarea
                      className="form-control"
                      placeholder="Provide guidance for Jia's interviewing focus, e.g. emphasize REST APIs, microservices, database design, and clear communication."
                      value={aiSecretPrompt}
                      onChange={(e) => setAiSecretPrompt(e.target.value)}
                      style={{ minHeight: 120 }}
                    />
                  </div>
                </div>
              </div>

              <div className="layered-card-middle">
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "24px",
                    color: "#181D27",
                    marginLeft: "15px",
                  }}
                >
                  2. AI Interview Questions
                </span>
                <div className="layered-card-content">
                  <InterviewQuestionGeneratorV2
                    questions={questions}
                    setQuestions={(questions) => setQuestions(questions)}
                    jobTitle={jobTitle}
                    description={description}
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <div className="layered-card-middle">
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: "24px",
                  color: "#181D27",
                  marginLeft: "15px",
                }}
              >
                4. Review Career
              </span>
              <div className="layered-card-content">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <span
                    style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}
                  >
                    Summary
                  </span>
                  <span style={{ fontSize: 14, color: "#414651" }}>
                    Title: {jobTitle}
                  </span>
                  <span style={{ fontSize: 14, color: "#414651" }}>
                    Employment: {employmentType}
                  </span>
                  <span style={{ fontSize: 14, color: "#414651" }}>
                    Arrangement: {workSetup}
                  </span>
                  <span style={{ fontSize: 14, color: "#414651" }}>
                    Location: {country} {province ? `• ${province}` : ""}{" "}
                    {city ? `• ${city}` : ""}
                  </span>
                  <span style={{ fontSize: 14, color: "#414651" }}>
                    Salary:{" "}
                    {salaryNegotiable
                      ? "Negotiable"
                      : `${minimumSalary || 0} - ${maximumSalary || 0} PHP`}
                  </span>
                  {teamMembers.length > 0 && (
                    <span style={{ fontSize: 14, color: "#414651" }}>
                      Team: {teamMembers.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* tips (right side) */}
        <div
          style={{
            maxWidth: "33.3333%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            border: "1px solid red",
          }}
        >
          <div className="layered-card-middle">
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: "24px",
                  color: "#181D27",
                  marginLeft: "5px",
                }}
              >
                <i
                  className="las la-lightbulb"
                  style={{ color: "pink", fontSize: 20 }}
                ></i>
                Tips
              </span>
            </div>
            <div className="layered-card-content">
              <span
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#717680",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    lineHeight: "20px",
                    color: "#181D27",
                  }}
                >
                  Use clear, standar job titles
                </span>{" "}
                for better searchability (e.g., "Software Engineer" instead of
                "Code Ninja" or "Tech Rockstar").
              </span>

              <span
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#717680",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    lineHeight: "20px",
                    color: "#181D27",
                  }}
                >
                  Avoid abbreviations
                </span>{" "}
                or internal role codes that applicants may not understand (e.g.,
                use "QA Engineer" instead of "QE II" or "QA-TL")
              </span>

              <span
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#717680",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    lineHeight: "20px",
                    color: "#181D27",
                  }}
                >
                  Keep it concise —
                </span>{" "}
                job titles should be no more than a few words (2-4 max).
                avoiding fluff or marketing terms.
              </span>
            </div>
          </div>
        </div>
      </div>
      {showSaveModal && (
        <CareerActionModal
          action={showSaveModal}
          onAction={(action) => saveCareer(action)}
        />
      )}
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
