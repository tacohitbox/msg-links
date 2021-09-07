var xhr = new XMLHttpRequest();
xhr.open("GET", "/translate/languages");
xhr.send();
xhr.onload = function() {
  try {
    var j = JSON.parse(xhr.responseText);
    for (var c in j) {
      if (j[c] == "Automatic") {continue} else {
        var o = document.createElement("option");
        o.innerHTML = j[c];
        document.getElementById("trans-language").append(o);
      }
    }
    document.getElementById("trans-load").style.display = "none";
    document.getElementById("trans-prep").style.display = "block";
  } catch(error) {
    document.getElementById("trans-load").style.display = "none";
    document.getElementById("trans-err").style.display = "block";
  }
}
xhr.onerror = function() {
  document.getElementById("trans-load").style.display = "none";
  document.getElementById("trans-err").style.display = "block";
}

function translate() {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/translate");
  var fd = new FormData();
  fd.append("text", document.querySelector(".content").innerHTML);
  fd.append("to", document.getElementById("trans-language").value);
  document.getElementById("trans-load").style.display = "block";
  document.getElementById("trans-prep").style.display = "none";
  document.getElementById("trans-loadtxt").innerHTML = "Translating...";
  xhr.send(fd);
  xhr.onload = function() {
    try {
      var j = JSON.parse(xhr.responseText);
      document.querySelector(".content").setAttribute("data-original", document.querySelector(".content").innerHTML);
      document.querySelector(".content").innerHTML = j.text;
      document.getElementById("trans-load").style.display = "none";
      document.getElementById("trans-done").style.display = "block";
    } catch(error) {
      document.getElementById("trans-load").style.display = "none";
      document.getElementById("trans-err").style.display = "block";
    }
  }
  xhr.onerror = function() {
    document.getElementById("trans-load").style.display = "none";
    document.getElementById("trans-err").style.display = "block";
  }
}

function restore() {
  document.querySelector(".content").innerHTML = document.querySelector(".content").getAttribute("data-original");
  document.getElementById("trans-done").style.display = "none";
  document.getElementById("trans-prep").style.display = "block";
}