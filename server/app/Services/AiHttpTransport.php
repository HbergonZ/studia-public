<?php
namespace App\Services;

final class AiHttpTransport
{
    public static function request(string $method, string $url, array $headers, ?array $payload, int $timeoutMs): array
    {
        $responseHeaders = [];
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT_MS => $timeoutMs,
            CURLOPT_CONNECTTIMEOUT_MS => min(10000, $timeoutMs), CURLOPT_HTTPHEADER => $headers,
            CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
                if (str_starts_with($line, 'HTTP/')) $responseHeaders = [];
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                return strlen($line);
            }]);
        if ($method === 'POST') curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_errno($ch);
        curl_close($ch);
        return ['status' => $status, 'headers' => $responseHeaders, 'body' => $body === false ? '' : $body,
            'error' => $error === CURLE_OPERATION_TIMEDOUT ? 'timeout' : ($error ? 'network_error' : null)];
    }
}
