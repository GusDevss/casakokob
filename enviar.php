<?php
// Recibe el formulario de la landing y lo envía por correo mediante SMTP (PHPMailer).
// Los destinatarios, el remitente y los datos del servidor de correo están en config-correo.php.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';

header('Content-Type: application/json; charset=utf-8');

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

// Campo trampa para bots: las personas no lo ven, así que debe llegar vacío.
if (!empty($_POST['sitio_web'])) {
    responder(200, ['ok' => true]);
}

// Quita saltos de línea para evitar inyección de cabeceras y limita la longitud.
function limpiar(string $clave, int $max = 200): string {
    $valor = trim((string)($_POST[$clave] ?? ''));
    $valor = preg_replace('/[\r\n\t]+/', ' ', $valor);
    return mb_substr($valor, 0, $max);
}

$nombre     = limpiar('nombre', 80);
$telefono   = limpiar('telefono', 40);
$email      = limpiar('email', 120);
$lote       = limpiar('lote', 40);
$plan       = limpiar('plan', 40);
$cotizacion = limpiar('cotizacion', 400);
$mensaje    = mb_substr(trim((string)($_POST['mensaje'] ?? '')), 0, 3000);

$faltantes = [];
if ($nombre === '')   $faltantes[] = 'nombre';
if ($telefono === '') $faltantes[] = 'teléfono';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $faltantes[] = 'correo electrónico';
if ($faltantes) {
    responder(422, ['ok' => false, 'error' => 'Revisa: ' . implode(', ', $faltantes) . '.']);
}

$e = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
$soloDigitos = preg_replace('/\D+/', '', $telefono);
$filas = [
    'Nombre'              => $nombre,
    'Teléfono / WhatsApp' => $telefono,
    'Correo'              => $email,
    'Lote de interés'     => $lote !== '' ? $lote : 'Aún no lo sabe',
    'Plan de pago'        => $plan !== '' ? $plan : 'Aún no lo sabe',
];
if ($cotizacion !== '') {
    $filas['Cotización'] = $cotizacion;
}

$html = '<div style="font-family:Arial,sans-serif;color:#2b1812;font-size:15px">'
      . '<h2 style="margin:0 0 16px;color:#4a2018">Nuevo prospecto desde la landing de Casa Kokob</h2>'
      . '<table cellpadding="8" style="border-collapse:collapse">';
foreach ($filas as $etiqueta => $valor) {
    $html .= '<tr><td style="border-bottom:1px solid #e6dccb;font-weight:bold;vertical-align:top">' . $e($etiqueta) . '</td>'
           . '<td style="border-bottom:1px solid #e6dccb">' . $e($valor) . '</td></tr>';
}
$html .= '</table>';
if ($mensaje !== '') {
    $html .= '<p style="margin:20px 0 6px;font-weight:bold">Mensaje</p><p style="margin:0">' . nl2br($e($mensaje)) . '</p>';
}
if (strlen($soloDigitos) >= 10) {
    // Números de 10 dígitos se asumen de México
    $wa = strlen($soloDigitos) === 10 ? '52' . $soloDigitos : $soloDigitos;
    $html .= '<p style="margin-top:20px"><a href="https://wa.me/' . $e($wa) . '" style="color:#1fae5b;font-weight:bold">Escribirle por WhatsApp</a></p>';
}
$html .= '<p style="margin-top:24px;color:#6d5a4e;font-size:13px">Responde a este correo para contestarle directamente a ' . $e($nombre) . '.</p></div>';

$texto = "Nuevo prospecto desde la landing de Casa Kokob\n\n";
foreach ($filas as $etiqueta => $valor) {
    $texto .= "$etiqueta: $valor\n";
}
if ($mensaje !== '') {
    $texto .= "\nMensaje:\n$mensaje\n";
}

$archivoConfig = __DIR__ . '/config-correo.php';
if (!is_file($archivoConfig)) {
    error_log('enviar.php: falta config-correo.php');
    responder(500, ['ok' => false, 'error' => 'El envío de correos no está configurado.']);
}
$config = require $archivoConfig;

$correo = new PHPMailer(true);
try {
    $correo->isSMTP();
    $correo->Host       = $config['smtp_host'];
    $correo->Port       = (int)$config['smtp_puerto'];
    if ($config['smtp_cifrado'] === 'ssl') {
        $correo->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($config['smtp_cifrado'] === 'tls') {
        $correo->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $correo->SMTPAutoTLS = false;
    }
    $correo->SMTPAuth   = true;
    $correo->Username   = $config['smtp_usuario'];
    $correo->Password   = $config['smtp_password'];
    $correo->CharSet    = PHPMailer::CHARSET_UTF8;
    $correo->Timeout    = 20;

    // Casi todos los servidores solo permiten enviar como la cuenta con la que se inicia sesión.
    $correo->setFrom($config['remitente'] ?: $config['smtp_usuario'], $config['nombre_remitente']);
    foreach ($config['destinatarios'] as $destinatario) {
        $correo->addAddress($destinatario);
    }
    $correo->addReplyTo($email, $nombre);

    $correo->isHTML(true);
    $correo->Subject = $config['asunto'] . ' · ' . $nombre;
    $correo->Body    = $html;
    $correo->AltBody = $texto;

    $correo->send();
} catch (MailerException $ex) {
    error_log('enviar.php: ' . $correo->ErrorInfo);
    responder(500, ['ok' => false, 'error' => 'No se pudo enviar el correo.']);
}

responder(200, ['ok' => true]);
