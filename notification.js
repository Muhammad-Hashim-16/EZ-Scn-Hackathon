setTimeout(() => {
  new Notification("⛽ Petrol Price Update", {
    body: "Petrol is now PKR 366.58/liter. Your monthly fuel cost is affected.",
    icon: "/logo.png"
  });
}, 10000);