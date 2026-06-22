(function () {
  var STORAGE_KEY = "homework_ui_assignments_v4";

  var STATUS = { NORMAL: "normal", REGISTERED: "registered", NONE: "none" };

  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getStateClass(student) {
    if (student.status === STATUS.REGISTERED) return "is-registered";
    if (student.status === STATUS.NONE) return "no-registration";
    return "";
  }

  function getStemBranchName(index) {
    return STEMS[index % STEMS.length] + BRANCHES[index % BRANCHES.length];
  }

  function getDisplayName(student, index, hideNames) {
    if (!hideNames) return student.name;
    return getStemBranchName(index);
  }

  function getStatusText(status) {
    if (status === STATUS.REGISTERED) return "已登记";
    if (status === STATUS.NONE) return "无登记";
    return "普通状态";
  }

  function getCardAriaLabel(student, index, hideNames) {
    var displayName = getDisplayName(student, index, hideNames);
    var statusText = getStatusText(student.status);
    var badgeText = student.badge ? "，标记 " + student.badge : "";
    var noteText = student.note ? "，备注 " + student.note : "";
    return student.serial + "号，" + displayName + "，" + statusText + badgeText + noteText;
  }

  function getAssignmentStats(students) {
    var active = [];
    for (var i = 0; i < students.length; i++) {
      if (students[i].status !== STATUS.NONE) active.push(students[i]);
    }
    var submitted = 0;
    for (var j = 0; j < active.length; j++) {
      if (active[j].status === STATUS.REGISTERED) submitted++;
    }
    var total = active.length;
    return {
      submitted: submitted,
      total: total,
      pending: Math.max(0, total - submitted)
    };
  }

  function loadStateData() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      var parsed = JSON.parse(stored);
      if (!parsed || !Array.isArray(parsed.assignments)) return null;

      var assignments = [];
      for (var k = 0; k < parsed.assignments.length; k++) {
        var item = parsed.assignments[k];
        if (item && Array.isArray(item.students)) assignments.push(item);
      }
      if (assignments.length === 0) return null;

      var currentId = parsed.currentAssignmentId;
      var currentAssignment = null;
      for (var m = 0; m < assignments.length; m++) {
        if (assignments[m].id === currentId) {
          currentAssignment = assignments[m];
          break;
        }
      }
      if (!currentAssignment) currentAssignment = assignments[0];

      return {
        hideNames: Boolean(parsed.hideNames),
        assignment: currentAssignment
      };
    } catch (e) {
      return null;
    }
  }

  function renderBootstrap() {
    var data = loadStateData();
    if (!data || !data.assignment) return;

    var assignment = data.assignment;
    var hideNames = data.hideNames;
    var students = assignment.students;

    var titleEl = document.getElementById("assignmentTitle");
    if (titleEl) titleEl.textContent = assignment.title;

    document.title = assignment.title + " UI";

    var stats = getAssignmentStats(students);
    var progressBar = document.getElementById("progressBar");
    if (progressBar) {
      var ratio = stats.total > 0 ? stats.submitted / stats.total : 0;
      progressBar.style.setProperty("--progress", String(ratio));
      progressBar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    }

    var grid = document.getElementById("studentGrid");
    if (!grid) return;

    var html = "";
    for (var i = 0; i < students.length; i++) {
      var student = students[i];
      var stateClass = getStateClass(student);
      var displayName = getDisplayName(student, i, hideNames);
      var badgeHTML = student.badge
        ? '<div class="badge">' + escapeHTML(student.badge) + "</div>"
        : "";
      var noteHTML = student.note
        ? '<div class="note-text">' + escapeHTML(student.note) + "</div>"
        : "";
      var ariaLabel = escapeHTML(getCardAriaLabel(student, i, hideNames));

      html +=
        '<button class="student-card ' + stateClass + '" type="button" data-id="' + student.id + '" aria-label="' + ariaLabel + '">' +
          '<div class="serial">' + escapeHTML(student.serial) + "</div>" +
          badgeHTML +
          '<div class="name">' + escapeHTML(displayName) + "</div>" +
          noteHTML +
        "</button>";
    }
    grid.innerHTML = html;
  }

  renderBootstrap();
})();
