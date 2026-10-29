<?php
header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="teamkanban-tasks.csv"');
$host=getenv('DB_HOST') ?: '127.0.0.1';$port=getenv('DB_PORT') ?: '3306';$db=getenv('DB_NAME') ?: 'teamkanban';$user=getenv('DB_USER') ?: 'root';$pass=getenv('DB_PASSWORD') ?: '';
try{$pdo=new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);}catch(Throwable $e){http_response_code(503);exit('Database unavailable');}
$project=(int)($_GET['project_id']??0);$stmt=$pdo->prepare('SELECT id,title,status,priority,type,due_date,created_at FROM tasks WHERE project_id=? ORDER BY created_at DESC');$stmt->execute([$project]);$out=fopen('php://output','w');fputcsv($out,['ID','Title','Status','Priority','Type','Due Date','Created At']);while($row=$stmt->fetch(PDO::FETCH_ASSOC))fputcsv($out,$row);fclose($out);
