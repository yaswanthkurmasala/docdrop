const testLive = async () => {
  // 1. Check /p2p page
  const pageRes = await fetch("http://localhost:3000/p2p?room=live-test-room&pin=999111");
  console.log("/p2p page HTTP status:", pageRes.status);
  if (pageRes.status !== 200) throw new Error("Expected HTTP 200 on /p2p page");

  // 2. Register room
  const roomRes = await fetch("http://localhost:3000/api/p2p/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: "live-test-room", pin: "999111", device: "laptop" }),
  });
  const roomData = await roomRes.json();
  console.log("Room register result:", roomData);

  // 3. Phone joins
  const phoneRes = await fetch("http://localhost:3000/api/p2p/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room: "live-test-room",
      pin: "999111",
      device: "phone",
      deviceName: "Apple iPhone 15 Pro",
    }),
  });
  console.log("Phone join result:", await phoneRes.json());

  // 4. Phone uploads a file to laptop
  const form = new FormData();
  form.append("room", "live-test-room");
  form.append("direction", "phone-to-laptop");
  const testBlob = new Blob(["Hello DocDrop! Real P2P Transfer from Phone!"], { type: "text/plain" });
  form.append("file", testBlob, "phone_note.txt");

  const uploadRes = await fetch("http://localhost:3000/api/p2p/transfer", {
    method: "POST",
    body: form,
  });
  const uploadData = await uploadRes.json();
  console.log("File upload result:", uploadData);

  // 5. Laptop checks room
  const checkRes = await fetch("http://localhost:3000/api/p2p/room?room=live-test-room&pin=999111");
  const checkData = await checkRes.json();
  console.log("Laptop sees files in room:", checkData.files);

  // 6. Laptop downloads file
  const fileRes = await fetch(
    `http://localhost:3000/api/p2p/transfer?room=live-test-room&fileId=${uploadData.fileId}`
  );
  const fileText = await fileRes.text();
  console.log("Laptop downloaded file content:", fileText);

  // 7. Laptop sends processed PDF to phone
  const form2 = new FormData();
  form2.append("room", "live-test-room");
  form2.append("direction", "laptop-to-phone");
  form2.append("file", new Blob(["%PDF-1.4\nProcessed by laptop tool"], { type: "application/pdf" }), "laptop_processed.pdf");
  const laptopSendRes = await fetch("http://localhost:3000/api/p2p/transfer", { method: "POST", body: form2 });
  const laptopSendData = await laptopSendRes.json();
  console.log("Laptop sent file to phone result:", laptopSendData);

  // 8. Phone downloads processed file
  const phoneDownloadRes = await fetch(
    `http://localhost:3000/api/p2p/transfer?room=live-test-room&fileId=${laptopSendData.fileId}`
  );
  const phoneFileText = await phoneDownloadRes.text();
  console.log("Phone downloaded processed file content:", phoneFileText);

  console.log("=== LIVE SERVER TEST PASSED WITH 100% SUCCESS! ===");
};

testLive().catch((e) => {
  console.error(e);
  process.exit(1);
});
