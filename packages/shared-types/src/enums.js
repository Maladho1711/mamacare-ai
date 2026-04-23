"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireType = exports.AlertLevel = exports.PatientStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["DOCTOR"] = "doctor";
    UserRole["PATIENT"] = "patient";
})(UserRole || (exports.UserRole = UserRole = {}));
var PatientStatus;
(function (PatientStatus) {
    PatientStatus["PREGNANT"] = "pregnant";
    PatientStatus["POSTNATAL"] = "postnatal";
    PatientStatus["COMPLETED"] = "completed";
})(PatientStatus || (exports.PatientStatus = PatientStatus = {}));
var AlertLevel;
(function (AlertLevel) {
    AlertLevel["GREEN"] = "green";
    AlertLevel["ORANGE"] = "orange";
    AlertLevel["RED"] = "red";
})(AlertLevel || (exports.AlertLevel = AlertLevel = {}));
var QuestionnaireType;
(function (QuestionnaireType) {
    QuestionnaireType["PREGNANCY"] = "pregnancy";
    QuestionnaireType["POSTNATAL"] = "postnatal";
})(QuestionnaireType || (exports.QuestionnaireType = QuestionnaireType = {}));
//# sourceMappingURL=enums.js.map