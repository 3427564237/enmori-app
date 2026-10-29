bool validActivitySourceUrl(Uri url) =>
    url.scheme == 'https' &&
    const [
      'ticketmaster.sg',
      'www.ticketmaster.sg',
      'www1.ticketmaster.sg',
      'www.onepa.gov.sg',
    ].contains(url.host) &&
    url.userInfo.isEmpty &&
    !url.hasFragment &&
    (!url.hasPort || url.port == 443) &&
    url.toString().length <= 2048 &&
    !RegExp(r'[\s\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]')
        .hasMatch(url.toString()) &&
    !url.queryParameters.keys.any(
      (k) => RegExp(
        r'^(api[_-]?key|token|access_token|secret|password|authorization)$',
        caseSensitive: false,
      ).hasMatch(k),
    );
